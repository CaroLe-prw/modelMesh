use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

pub type ModelPriceRates = BTreeMap<String, i64>;
pub const PRICE_NANO_SCALE: i64 = 100_000_000;

#[derive(Clone, Copy, Debug, Default, Eq, Hash, PartialEq)]
pub enum PriceCurrency {
    #[default]
    Usd,
    Cny,
    Eur,
    Gbp,
    Jpy,
    Hkd,
    Sgd,
    Aud,
    Cad,
    Krw,
    Usdt,
}

impl PriceCurrency {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Usd => "USD",
            Self::Cny => "CNY",
            Self::Eur => "EUR",
            Self::Gbp => "GBP",
            Self::Jpy => "JPY",
            Self::Hkd => "HKD",
            Self::Sgd => "SGD",
            Self::Aud => "AUD",
            Self::Cad => "CAD",
            Self::Krw => "KRW",
            Self::Usdt => "USDT",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "USD" => Some(Self::Usd),
            "CNY" => Some(Self::Cny),
            "EUR" => Some(Self::Eur),
            "GBP" => Some(Self::Gbp),
            "JPY" => Some(Self::Jpy),
            "HKD" => Some(Self::Hkd),
            "SGD" => Some(Self::Sgd),
            "AUD" => Some(Self::Aud),
            "CAD" => Some(Self::Cad),
            "KRW" => Some(Self::Krw),
            "USDT" => Some(Self::Usdt),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PriceExchangeRate {
    currency: PriceCurrency,
    nano_units_per_usd: i64,
}

impl PriceExchangeRate {
    pub fn new(currency: PriceCurrency, nano_units_per_usd: i64) -> Option<Self> {
        (nano_units_per_usd > 0
            && (currency != PriceCurrency::Usd || nano_units_per_usd == PRICE_NANO_SCALE))
            .then_some(Self {
                currency,
                nano_units_per_usd,
            })
    }

    pub fn parse(currency: PriceCurrency, units_per_usd: &str) -> Option<Self> {
        Self::new(currency, price_per_million_to_nano(units_per_usd.trim())?)
    }

    pub const fn currency(self) -> PriceCurrency {
        self.currency
    }

    pub const fn nano_units_per_usd(self) -> i64 {
        self.nano_units_per_usd
    }

    pub fn currency_nano_to_usd(self, value: i64) -> Option<i64> {
        checked_mul_div_round(value, PRICE_NANO_SCALE, self.nano_units_per_usd)
    }

    pub fn pricing_currency_to_usd(self, pricing: ModelPricing) -> Option<ModelPricing> {
        pricing.checked_map_prices(|value| self.currency_nano_to_usd(value))
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPricing {
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub base: ModelPriceRates,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_over_200k: Option<ModelPriceRates>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tiers: Vec<ModelPriceTier>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub experimental_modes: BTreeMap<String, ModelPriceRates>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub experimental_mode_tiers: BTreeMap<String, Vec<ModelPriceTier>>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub service_tiers: BTreeMap<String, ModelPriceRates>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPriceTier {
    pub tier_type: String,
    pub size: i64,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub rates: ModelPriceRates,
}

impl ModelPricing {
    pub fn with_required_base_prices(mut self, input: i64, output: i64) -> Self {
        self.base.entry("input".to_owned()).or_insert(input);
        self.base.entry("output".to_owned()).or_insert(output);
        self
    }

    pub fn merged_with(&self, overrides: &Self) -> Self {
        let mut merged = self.clone();
        merged.base.extend(overrides.base.clone());

        if let Some(rates) = &overrides.context_over_200k {
            merged
                .context_over_200k
                .get_or_insert_default()
                .extend(rates.clone());
        }

        merge_price_tiers(&mut merged.tiers, &overrides.tiers);

        merge_named_rates(
            &mut merged.experimental_modes,
            &overrides.experimental_modes,
        );
        merge_named_price_tiers(
            &mut merged.experimental_mode_tiers,
            &overrides.experimental_mode_tiers,
        );
        merge_named_rates(&mut merged.service_tiers, &overrides.service_tiers);
        merged
    }

    pub fn merged_with_supported(&self, overrides: &Self) -> Self {
        let mut merged = self.clone();
        merge_supported_rates(&mut merged.base, &overrides.base);

        if let (Some(target), Some(source)) = (
            merged.context_over_200k.as_mut(),
            overrides.context_over_200k.as_ref(),
        ) {
            merge_supported_rates(target, source);
        }

        for override_tier in &overrides.tiers {
            if let Some(tier) = merged.tiers.iter_mut().find(|tier| {
                tier.tier_type == override_tier.tier_type && tier.size == override_tier.size
            }) {
                merge_supported_rates(&mut tier.rates, &override_tier.rates);
            }
        }
        merge_supported_named_rates(
            &mut merged.experimental_modes,
            &overrides.experimental_modes,
        );
        merge_supported_named_price_tiers(
            &mut merged.experimental_mode_tiers,
            &overrides.experimental_mode_tiers,
        );
        merge_supported_named_rates(&mut merged.service_tiers, &overrides.service_tiers);
        merged
    }

    fn checked_map_prices(mut self, map: impl Copy + Fn(i64) -> Option<i64>) -> Option<Self> {
        self.base = checked_map_rates(self.base, map)?;
        self.context_over_200k = match self.context_over_200k {
            Some(rates) => Some(checked_map_rates(rates, map)?),
            None => None,
        };
        self.tiers = checked_map_tiers(self.tiers, map)?;
        self.experimental_modes = self
            .experimental_modes
            .into_iter()
            .map(|(name, rates)| Some((name, checked_map_rates(rates, map)?)))
            .collect::<Option<_>>()?;
        self.experimental_mode_tiers = self
            .experimental_mode_tiers
            .into_iter()
            .map(|(name, tiers)| Some((name, checked_map_tiers(tiers, map)?)))
            .collect::<Option<_>>()?;
        self.service_tiers = self
            .service_tiers
            .into_iter()
            .map(|(name, rates)| Some((name, checked_map_rates(rates, map)?)))
            .collect::<Option<_>>()?;
        Some(self)
    }
}

pub fn price_increase_exceeds_basis_points(
    current: &ModelPricing,
    proposed: &ModelPricing,
    threshold_basis_points: i64,
) -> bool {
    rates_exceed_threshold(&current.base, &proposed.base, threshold_basis_points)
        || optional_rates_exceed_threshold(
            current.context_over_200k.as_ref(),
            proposed.context_over_200k.as_ref(),
            threshold_basis_points,
        )
        || proposed.tiers.iter().any(|proposed_tier| {
            let current_rates = current
                .tiers
                .iter()
                .find(|tier| {
                    tier.tier_type == proposed_tier.tier_type && tier.size == proposed_tier.size
                })
                .map(|tier| &tier.rates);
            optional_rates_exceed_threshold(
                current_rates,
                Some(&proposed_tier.rates),
                threshold_basis_points,
            )
        })
        || named_rates_exceed_threshold(
            &current.experimental_modes,
            &proposed.experimental_modes,
            threshold_basis_points,
        )
        || proposed
            .experimental_mode_tiers
            .iter()
            .any(|(name, proposed_tiers)| {
                let current_tiers = current.experimental_mode_tiers.get(name);
                proposed_tiers.iter().any(|proposed_tier| {
                    let current_rates = current_tiers
                        .and_then(|tiers| {
                            tiers.iter().find(|tier| {
                                tier.tier_type == proposed_tier.tier_type
                                    && tier.size == proposed_tier.size
                            })
                        })
                        .map(|tier| &tier.rates);
                    optional_rates_exceed_threshold(
                        current_rates,
                        Some(&proposed_tier.rates),
                        threshold_basis_points,
                    )
                })
            })
        || named_rates_exceed_threshold(
            &current.service_tiers,
            &proposed.service_tiers,
            threshold_basis_points,
        )
}

fn named_rates_exceed_threshold(
    current: &BTreeMap<String, ModelPriceRates>,
    proposed: &BTreeMap<String, ModelPriceRates>,
    threshold_basis_points: i64,
) -> bool {
    proposed.iter().any(|(name, proposed_rates)| {
        optional_rates_exceed_threshold(
            current.get(name),
            Some(proposed_rates),
            threshold_basis_points,
        )
    })
}

fn optional_rates_exceed_threshold(
    current: Option<&ModelPriceRates>,
    proposed: Option<&ModelPriceRates>,
    threshold_basis_points: i64,
) -> bool {
    proposed.is_some_and(|proposed| {
        proposed.iter().any(|(name, proposed_price)| {
            price_exceeds_threshold(
                current.and_then(|rates| rates.get(name)).copied(),
                *proposed_price,
                threshold_basis_points,
            )
        })
    })
}

fn rates_exceed_threshold(
    current: &ModelPriceRates,
    proposed: &ModelPriceRates,
    threshold_basis_points: i64,
) -> bool {
    proposed.iter().any(|(name, proposed_price)| {
        price_exceeds_threshold(
            current.get(name).copied(),
            *proposed_price,
            threshold_basis_points,
        )
    })
}

fn price_exceeds_threshold(
    current_price: Option<i64>,
    proposed_price: i64,
    threshold_basis_points: i64,
) -> bool {
    if proposed_price <= 0 || threshold_basis_points < 0 {
        return false;
    }
    let current_price = current_price.unwrap_or(0);
    if proposed_price <= current_price {
        return false;
    }
    if current_price == 0 {
        return true;
    }

    i128::from(proposed_price - current_price) * 10_000
        > i128::from(current_price) * i128::from(threshold_basis_points)
}

fn checked_map_rates(
    rates: ModelPriceRates,
    map: impl Copy + Fn(i64) -> Option<i64>,
) -> Option<ModelPriceRates> {
    rates
        .into_iter()
        .map(|(name, value)| Some((name, map(value)?)))
        .collect()
}

fn checked_map_tiers(
    tiers: Vec<ModelPriceTier>,
    map: impl Copy + Fn(i64) -> Option<i64>,
) -> Option<Vec<ModelPriceTier>> {
    tiers
        .into_iter()
        .map(|tier| {
            Some(ModelPriceTier {
                tier_type: tier.tier_type,
                size: tier.size,
                rates: checked_map_rates(tier.rates, map)?,
            })
        })
        .collect()
}

fn checked_mul_div_round(value: i64, multiplier: i64, divisor: i64) -> Option<i64> {
    if value < 0 || multiplier <= 0 || divisor <= 0 {
        return None;
    }
    let numerator = i128::from(value).checked_mul(i128::from(multiplier))?;
    let rounded = numerator.checked_add(i128::from(divisor) / 2)? / i128::from(divisor);
    i64::try_from(rounded).ok()
}

fn merge_price_tiers(target: &mut Vec<ModelPriceTier>, overrides: &[ModelPriceTier]) {
    for override_tier in overrides {
        if let Some(tier) = target.iter_mut().find(|tier| {
            tier.tier_type == override_tier.tier_type && tier.size == override_tier.size
        }) {
            tier.rates.extend(override_tier.rates.clone());
        } else {
            target.push(override_tier.clone());
        }
    }
    sort_price_tiers(target);
}

fn merge_named_price_tiers(
    target: &mut BTreeMap<String, Vec<ModelPriceTier>>,
    overrides: &BTreeMap<String, Vec<ModelPriceTier>>,
) {
    for (name, tiers) in overrides {
        merge_price_tiers(target.entry(name.clone()).or_default(), tiers);
    }
}

fn merge_supported_named_price_tiers(
    target: &mut BTreeMap<String, Vec<ModelPriceTier>>,
    overrides: &BTreeMap<String, Vec<ModelPriceTier>>,
) {
    for (name, override_tiers) in overrides {
        let Some(target_tiers) = target.get_mut(name) else {
            continue;
        };
        for override_tier in override_tiers {
            if let Some(target_tier) = target_tiers.iter_mut().find(|tier| {
                tier.tier_type == override_tier.tier_type && tier.size == override_tier.size
            }) {
                merge_supported_rates(&mut target_tier.rates, &override_tier.rates);
            }
        }
    }
}

fn sort_price_tiers(tiers: &mut [ModelPriceTier]) {
    tiers.sort_by(|left, right| {
        left.size
            .cmp(&right.size)
            .then(left.tier_type.cmp(&right.tier_type))
    });
}

fn merge_supported_rates(target: &mut ModelPriceRates, overrides: &ModelPriceRates) {
    for (rate, value) in overrides {
        if let Some(target_value) = target.get_mut(rate) {
            *target_value = *value;
        }
    }
}

fn merge_supported_named_rates(
    target: &mut BTreeMap<String, ModelPriceRates>,
    overrides: &BTreeMap<String, ModelPriceRates>,
) {
    for (name, rates) in overrides {
        if let Some(target_rates) = target.get_mut(name) {
            merge_supported_rates(target_rates, rates);
        }
    }
}

fn merge_named_rates(
    target: &mut BTreeMap<String, ModelPriceRates>,
    overrides: &BTreeMap<String, ModelPriceRates>,
) {
    for (name, rates) in overrides {
        target
            .entry(name.clone())
            .or_default()
            .extend(rates.clone());
    }
}

pub fn price_per_million_to_nano(value: &str) -> Option<i64> {
    let (mantissa, exponent) =
        if let Some(index) = value.find(|character| ['e', 'E'].contains(&character)) {
            (&value[..index], value[index + 1..].parse::<i32>().ok()?)
        } else {
            (value, 0_i32)
        };
    if mantissa.starts_with('-') {
        return None;
    }
    let mantissa = mantissa.strip_prefix('+').unwrap_or(mantissa);
    let (whole, fraction) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    if whole.is_empty() && fraction.is_empty() {
        return None;
    }
    let mut coefficient = 0_u128;
    for digit in whole.bytes().chain(fraction.bytes()) {
        if !digit.is_ascii_digit() {
            return None;
        }
        coefficient = coefficient
            .checked_mul(10)?
            .checked_add(u128::from(digit - b'0'))?;
    }
    let fraction_digits = i32::try_from(fraction.len()).ok()?;
    let scale_power = exponent.checked_sub(fraction_digits)?.checked_add(8)?;
    let scaled = if scale_power >= 0 {
        coefficient.checked_mul(checked_pow10(scale_power.unsigned_abs())?)?
    } else {
        let divisor = match checked_pow10(scale_power.unsigned_abs()) {
            Some(divisor) => divisor,
            None => return Some(0),
        };
        coefficient.checked_add(divisor / 2)? / divisor
    };
    i64::try_from(scaled).ok()
}

pub fn usd_per_million_to_nano(value: &str) -> Option<i64> {
    price_per_million_to_nano(value)
}

fn checked_pow10(power: u32) -> Option<u128> {
    (0..power).try_fold(1_u128, |value, _| value.checked_mul(10))
}

#[cfg(test)]
#[path = "../../tests/unit/domain_model_pricing.rs"]
mod tests;

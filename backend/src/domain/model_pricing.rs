use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

pub type ModelPriceRates = BTreeMap<String, i64>;

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
    pub fn merged_with(&self, overrides: &Self) -> Self {
        let mut merged = self.clone();
        merged.base.extend(overrides.base.clone());

        if let Some(rates) = &overrides.context_over_200k {
            merged
                .context_over_200k
                .get_or_insert_default()
                .extend(rates.clone());
        }

        for override_tier in &overrides.tiers {
            if let Some(tier) = merged.tiers.iter_mut().find(|tier| {
                tier.tier_type == override_tier.tier_type && tier.size == override_tier.size
            }) {
                tier.rates.extend(override_tier.rates.clone());
            } else {
                merged.tiers.push(override_tier.clone());
            }
        }
        merged.tiers.sort_by(|left, right| {
            left.size
                .cmp(&right.size)
                .then(left.tier_type.cmp(&right.tier_type))
        });

        merge_named_rates(
            &mut merged.experimental_modes,
            &overrides.experimental_modes,
        );
        merge_named_rates(&mut merged.service_tiers, &overrides.service_tiers);
        merged
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

pub fn usd_per_million_to_nano(value: &str) -> Option<i64> {
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

fn checked_pow10(power: u32) -> Option<u128> {
    (0..power).try_fold(1_u128, |value, _| value.checked_mul(10))
}

#[cfg(test)]
#[path = "../../tests/unit/domain_model_pricing.rs"]
mod tests;

use std::collections::HashSet;

use crate::{
    domain::{AccountRole, PriceConfiguration, PriceCurrency, PriceExchangeRate},
    repository::PriceSettingsRepository,
};

use super::authorization::require_admin;

#[derive(Clone)]
pub struct PriceSettingsService {
    repository: PriceSettingsRepository,
}

pub struct PriceSettingInput {
    pub currency: String,
    pub units_per_usd: String,
}

pub struct PriceReviewPolicyInput {
    pub approved_price_effective_delay_hours: i32,
    pub price_increase_review_threshold_percent: String,
}

const SUPPORTED_PRICE_CURRENCY_COUNT: usize = 11;
const MAX_PRICE_INCREASE_REVIEW_THRESHOLD_BPS: i64 = 100_000;
const MAX_APPROVED_PRICE_EFFECTIVE_DELAY_HOURS: i32 = 720;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PriceSettingsServiceError {
    Forbidden,
    InvalidInput,
    Internal,
}

impl PriceSettingsService {
    pub fn new(repository: PriceSettingsRepository) -> Self {
        Self { repository }
    }

    pub async fn get(
        &self,
        requester_role: AccountRole,
    ) -> Result<PriceConfiguration, PriceSettingsServiceError> {
        require_admin(requester_role, PriceSettingsServiceError::Forbidden)?;
        self.repository.get().await.map_err(|error| {
            tracing::error!(error = %error, "price settings lookup failed");
            PriceSettingsServiceError::Internal
        })
    }

    pub async fn update(
        &self,
        requester_role: AccountRole,
        inputs: Vec<PriceSettingInput>,
        review_policy: PriceReviewPolicyInput,
    ) -> Result<PriceConfiguration, PriceSettingsServiceError> {
        require_admin(requester_role, PriceSettingsServiceError::Forbidden)?;
        let exchange_rates = parse_exchange_rates(inputs)?;
        let threshold_bps =
            parse_percentage_basis_points(&review_policy.price_increase_review_threshold_percent)?;
        if !(0..=MAX_APPROVED_PRICE_EFFECTIVE_DELAY_HOURS)
            .contains(&review_policy.approved_price_effective_delay_hours)
        {
            return Err(PriceSettingsServiceError::InvalidInput);
        }
        self.repository
            .replace(
                &exchange_rates,
                threshold_bps,
                review_policy.approved_price_effective_delay_hours,
            )
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "price settings update failed");
                PriceSettingsServiceError::Internal
            })
    }
}

fn parse_percentage_basis_points(value: &str) -> Result<i64, PriceSettingsServiceError> {
    let value = value.trim();
    if value.is_empty() || value.starts_with('-') || value.contains(['e', 'E']) {
        return Err(PriceSettingsServiceError::InvalidInput);
    }
    let (whole, fraction) = value.split_once('.').unwrap_or((value, ""));
    if whole.is_empty()
        || !whole.bytes().all(|digit| digit.is_ascii_digit())
        || !fraction.bytes().all(|digit| digit.is_ascii_digit())
        || fraction.len() > 2
    {
        return Err(PriceSettingsServiceError::InvalidInput);
    }
    let whole = whole
        .parse::<i64>()
        .map_err(|_| PriceSettingsServiceError::InvalidInput)?;
    let fraction = match fraction.len() {
        0 => 0,
        1 => {
            fraction
                .parse::<i64>()
                .map_err(|_| PriceSettingsServiceError::InvalidInput)?
                * 10
        }
        2 => fraction
            .parse::<i64>()
            .map_err(|_| PriceSettingsServiceError::InvalidInput)?,
        _ => return Err(PriceSettingsServiceError::InvalidInput),
    };
    let basis_points = whole
        .checked_mul(100)
        .and_then(|value| value.checked_add(fraction))
        .ok_or(PriceSettingsServiceError::InvalidInput)?;
    (basis_points <= MAX_PRICE_INCREASE_REVIEW_THRESHOLD_BPS)
        .then_some(basis_points)
        .ok_or(PriceSettingsServiceError::InvalidInput)
}

fn parse_exchange_rate(
    currency: &str,
    units_per_usd: &str,
) -> Result<PriceExchangeRate, PriceSettingsServiceError> {
    let currency = PriceCurrency::parse(currency).ok_or(PriceSettingsServiceError::InvalidInput)?;
    PriceExchangeRate::parse(currency, units_per_usd).ok_or(PriceSettingsServiceError::InvalidInput)
}

fn parse_exchange_rates(
    inputs: Vec<PriceSettingInput>,
) -> Result<Vec<PriceExchangeRate>, PriceSettingsServiceError> {
    if inputs.is_empty() || inputs.len() > SUPPORTED_PRICE_CURRENCY_COUNT {
        return Err(PriceSettingsServiceError::InvalidInput);
    }

    let mut currencies = HashSet::with_capacity(inputs.len());
    let exchange_rates = inputs
        .into_iter()
        .map(|input| {
            let exchange_rate = parse_exchange_rate(&input.currency, &input.units_per_usd)?;
            if !currencies.insert(exchange_rate.currency()) {
                return Err(PriceSettingsServiceError::InvalidInput);
            }
            Ok(exchange_rate)
        })
        .collect::<Result<Vec<_>, _>>()?;

    currencies
        .contains(&PriceCurrency::Usd)
        .then_some(exchange_rates)
        .ok_or(PriceSettingsServiceError::InvalidInput)
}

#[cfg(test)]
#[path = "../../tests/unit/services_price_settings.rs"]
mod tests;

use crate::domain::PriceCurrency;

use super::{
    PriceSettingInput, PriceSettingsServiceError, parse_exchange_rate, parse_exchange_rates,
    parse_percentage_basis_points,
};

#[test]
fn model_price_review_threshold_is_stored_as_exact_basis_points() {
    assert_eq!(parse_percentage_basis_points("0"), Ok(0));
    assert_eq!(parse_percentage_basis_points("12.34"), Ok(1_234));
    assert_eq!(
        parse_percentage_basis_points("12.345"),
        Err(PriceSettingsServiceError::InvalidInput)
    );
    assert_eq!(
        parse_percentage_basis_points("1000.01"),
        Err(PriceSettingsServiceError::InvalidInput)
    );
}

#[test]
fn fixed_exchange_rate_uses_stable_currency_codes() {
    let rate = parse_exchange_rate("CNY", "7.2").expect("CNY exchange rate should be valid");

    assert_eq!(rate.currency(), PriceCurrency::Cny);
    assert_eq!(rate.nano_units_per_usd(), 720_000_000);
}

#[test]
fn usd_rate_is_always_the_identity_rate() {
    assert!(parse_exchange_rate("USD", "1").is_ok());
    assert_eq!(
        parse_exchange_rate("USD", "1.01"),
        Err(PriceSettingsServiceError::InvalidInput)
    );
}

#[test]
fn unsupported_currency_and_non_positive_rates_are_rejected() {
    assert_eq!(
        parse_exchange_rate("RMB", "7.2"),
        Err(PriceSettingsServiceError::InvalidInput)
    );
    assert_eq!(
        parse_exchange_rate("CNY", "0"),
        Err(PriceSettingsServiceError::InvalidInput)
    );
}

#[test]
fn multiple_unique_currency_rates_are_accepted() {
    let rates = parse_exchange_rates(vec![
        PriceSettingInput {
            currency: "USD".to_owned(),
            units_per_usd: "1".to_owned(),
        },
        PriceSettingInput {
            currency: "CNY".to_owned(),
            units_per_usd: "7.2".to_owned(),
        },
        PriceSettingInput {
            currency: "EUR".to_owned(),
            units_per_usd: "0.92".to_owned(),
        },
    ])
    .expect("unique configured currencies should be valid");

    assert_eq!(rates.len(), 3);
    assert_eq!(rates[0].currency(), PriceCurrency::Usd);
    assert_eq!(rates[1].currency(), PriceCurrency::Cny);
    assert_eq!(rates[2].currency(), PriceCurrency::Eur);
}

#[test]
fn empty_and_duplicate_currency_sets_are_rejected() {
    assert_eq!(
        parse_exchange_rates(Vec::new()),
        Err(PriceSettingsServiceError::InvalidInput)
    );
    assert_eq!(
        parse_exchange_rates(vec![
            PriceSettingInput {
                currency: "CNY".to_owned(),
                units_per_usd: "7.2".to_owned(),
            },
            PriceSettingInput {
                currency: "CNY".to_owned(),
                units_per_usd: "7.3".to_owned(),
            },
        ]),
        Err(PriceSettingsServiceError::InvalidInput)
    );
}

#[test]
fn usd_is_required_as_the_default_currency() {
    assert_eq!(
        parse_exchange_rates(vec![PriceSettingInput {
            currency: "CNY".to_owned(),
            units_per_usd: "7.2".to_owned(),
        }]),
        Err(PriceSettingsServiceError::InvalidInput)
    );
}

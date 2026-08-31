use crate::domain::{MerchantSettlementMethod, MerchantSettlementNetwork};

use super::{SystemSettingsServiceError, parse_scaled_decimal, validate_settlement_options};

#[test]
fn settlement_options_are_normalized_to_the_system_order() {
    let (methods, networks) = validate_settlement_options(
        vec![
            MerchantSettlementMethod::Usdt,
            MerchantSettlementMethod::Bank,
        ],
        vec![
            MerchantSettlementNetwork::Polygon,
            MerchantSettlementNetwork::Trc20,
        ],
    )
    .expect("settings should be valid");

    assert_eq!(
        methods,
        [
            MerchantSettlementMethod::Bank,
            MerchantSettlementMethod::Usdt
        ]
    );
    assert_eq!(
        networks,
        [
            MerchantSettlementNetwork::Trc20,
            MerchantSettlementNetwork::Polygon
        ]
    );
}

#[test]
fn enabled_usdt_requires_at_least_one_network() {
    assert!(matches!(
        validate_settlement_options(vec![MerchantSettlementMethod::Usdt], vec![]),
        Err(SystemSettingsServiceError::InvalidInput)
    ));
}

#[test]
fn financial_values_are_parsed_without_floating_point() {
    assert_eq!(
        parse_scaled_decimal("10.125001", 6, 1_000_000_000, false).expect("money should parse"),
        10_125_001
    );
    assert_eq!(
        parse_scaled_decimal("1.50", 2, 10_000, true).expect("rate should parse"),
        150
    );
}

#[test]
fn invalid_financial_values_are_rejected() {
    for value in ["-1", "1e2", "1.001", "101"] {
        assert!(matches!(
            parse_scaled_decimal(value, 2, 10_000, true),
            Err(SystemSettingsServiceError::InvalidInput)
        ));
    }
    assert!(matches!(
        parse_scaled_decimal("0", 6, 1_000_000_000, false),
        Err(SystemSettingsServiceError::InvalidInput)
    ));
}

use crate::domain::{MerchantSettlementMethod, MerchantSettlementNetwork};

use super::{MerchantSettlementSettingsServiceError, validate_settings};

#[test]
fn settlement_settings_are_normalized_to_the_system_order() {
    let (methods, networks) = validate_settings(
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
        validate_settings(vec![MerchantSettlementMethod::Usdt], vec![]),
        Err(MerchantSettlementSettingsServiceError::InvalidInput)
    ));
}

#[test]
fn duplicate_settings_are_rejected() {
    assert!(matches!(
        validate_settings(
            vec![
                MerchantSettlementMethod::Bank,
                MerchantSettlementMethod::Bank
            ],
            vec![]
        ),
        Err(MerchantSettlementSettingsServiceError::InvalidInput)
    ));
}

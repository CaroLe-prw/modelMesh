use time::OffsetDateTime;

use crate::{
    domain::{MerchantSettlementMethod, MerchantSettlementNetwork},
    entity::system_setting,
};

use super::system_settings_from_model;

#[test]
fn system_settings_model_maps_finance_and_enabled_options() {
    let settings = system_settings_from_model(system_setting::Model {
        id: 1,
        registration_enabled: false,
        withdrawal_minimum_microusd: 10_500_000,
        withdrawal_fee_bps: 150,
        platform_fee_bps: 800,
        bank_enabled: true,
        alipay_enabled: false,
        usdt_enabled: true,
        trc20_enabled: true,
        erc20_enabled: false,
        bep20_enabled: true,
        polygon_enabled: false,
        updated_by: Some(1),
        updated_at: OffsetDateTime::from_unix_timestamp(1_788_140_000)
            .expect("timestamp should be valid"),
    })
    .expect("settings should map");

    assert!(!settings.registration_enabled);
    assert_eq!(settings.finance.withdrawal_minimum_microusd, 10_500_000);
    assert_eq!(settings.finance.withdrawal_fee_bps, 150);
    assert_eq!(
        settings.settlement.enabled_methods,
        [
            MerchantSettlementMethod::Bank,
            MerchantSettlementMethod::Usdt
        ]
    );
    assert_eq!(
        settings.settlement.enabled_networks,
        [
            MerchantSettlementNetwork::Trc20,
            MerchantSettlementNetwork::Bep20
        ]
    );
}

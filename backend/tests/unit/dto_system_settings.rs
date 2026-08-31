use serde_json::json;

use crate::domain::{
    MerchantSettlementMethod, MerchantSettlementNetwork, MerchantSettlementSettings,
    SystemFinanceSettings, SystemSettings,
};

use super::{SystemSettingsResponse, UpdateSystemSettingsRequest};

#[test]
fn system_settings_use_exact_string_values_and_camel_case() {
    let request: UpdateSystemSettingsRequest = serde_json::from_value(json!({
        "registrationEnabled": false,
        "finance": {
            "withdrawalMinimumUsd": "10.50",
            "withdrawalFeePercent": "1.50",
            "platformFeePercent": "8.00"
        },
        "settlement": {
            "enabledMethods": ["bank", "usdt"],
            "enabledNetworks": ["TRC20", "BEP20"]
        }
    }))
    .expect("settings request should deserialize");
    assert!(!request.registration_enabled);
    assert_eq!(request.finance.withdrawal_minimum_usd, "10.50");

    let timestamp = "2026-08-31T06:00:03Z"
        .parse()
        .expect("timestamp should be valid");
    let response = SystemSettingsResponse::from(SystemSettings {
        registration_enabled: false,
        finance: SystemFinanceSettings {
            withdrawal_minimum_microusd: 10_500_000,
            withdrawal_fee_bps: 150,
            platform_fee_bps: 800,
        },
        settlement: MerchantSettlementSettings {
            enabled_methods: vec![
                MerchantSettlementMethod::Bank,
                MerchantSettlementMethod::Usdt,
            ],
            enabled_networks: vec![
                MerchantSettlementNetwork::Trc20,
                MerchantSettlementNetwork::Bep20,
            ],
            updated_at: timestamp,
        },
        updated_at: timestamp,
    });
    let value = serde_json::to_value(response).expect("settings response should serialize");
    assert_eq!(value["finance"]["withdrawalMinimumUsd"], json!("10.50"));
    assert_eq!(value["finance"]["withdrawalFeePercent"], json!("1.50"));
    assert_eq!(value["finance"]["platformFeePercent"], json!("8.00"));
    assert_eq!(
        value["settlement"]["enabledMethods"],
        json!(["bank", "usdt"])
    );
}

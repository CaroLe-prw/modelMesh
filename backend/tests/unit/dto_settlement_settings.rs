use serde_json::json;

use crate::domain::{
    MerchantSettlementMethod, MerchantSettlementNetwork, MerchantSettlementSettings,
};

use super::{MerchantSettlementSettingsResponse, UpdateMerchantSettlementSettingsRequest};

#[test]
fn settlement_settings_use_the_public_camel_case_contract() {
    let request: UpdateMerchantSettlementSettingsRequest = serde_json::from_value(json!({
        "enabledMethods": ["bank", "usdt"],
        "enabledNetworks": ["TRC20", "BEP20"]
    }))
    .expect("settings request should deserialize");
    assert_eq!(request.enabled_methods.len(), 2);
    assert_eq!(request.enabled_networks.len(), 2);

    let response = MerchantSettlementSettingsResponse::from(MerchantSettlementSettings {
        enabled_methods: vec![
            MerchantSettlementMethod::Bank,
            MerchantSettlementMethod::Usdt,
        ],
        enabled_networks: vec![
            MerchantSettlementNetwork::Trc20,
            MerchantSettlementNetwork::Bep20,
        ],
        updated_at: "2026-08-31T06:00:03Z"
            .parse()
            .expect("timestamp should be valid"),
    });
    let value = serde_json::to_value(response).expect("settings response should serialize");
    assert_eq!(value["enabledMethods"], json!(["bank", "usdt"]));
    assert_eq!(value["enabledNetworks"], json!(["TRC20", "BEP20"]));
}

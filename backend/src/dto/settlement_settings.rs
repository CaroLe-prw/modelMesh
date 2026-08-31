use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::MerchantSettlementSettings;

use super::merchant_profile::{MerchantSettlementMethodValue, MerchantSettlementNetworkValue};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantSettlementSettingsRequest {
    pub enabled_methods: Vec<MerchantSettlementMethodValue>,
    pub enabled_networks: Vec<MerchantSettlementNetworkValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantSettlementSettingsResponse {
    pub enabled_methods: Vec<&'static str>,
    pub enabled_networks: Vec<&'static str>,
    pub updated_at: Timestamp,
}

impl From<MerchantSettlementSettings> for MerchantSettlementSettingsResponse {
    fn from(settings: MerchantSettlementSettings) -> Self {
        Self {
            enabled_methods: settings
                .enabled_methods
                .into_iter()
                .map(|method| method.as_str())
                .collect(),
            enabled_networks: settings
                .enabled_networks
                .into_iter()
                .map(|network| network.as_str())
                .collect(),
            updated_at: settings.updated_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_settlement_settings.rs"]
mod tests;

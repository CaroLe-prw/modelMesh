use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{MerchantSettlementSettings, SystemFinanceSettings, SystemSettings};

use super::merchant_profile::{MerchantSettlementMethodValue, MerchantSettlementNetworkValue};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSystemSettingsRequest {
    pub registration_enabled: bool,
    pub finance: UpdateSystemFinanceSettingsRequest,
    pub settlement: UpdateMerchantSettlementSettingsRequest,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSystemFinanceSettingsRequest {
    pub withdrawal_minimum_usd: String,
    pub withdrawal_fee_percent: String,
    pub platform_fee_percent: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantSettlementSettingsRequest {
    pub enabled_methods: Vec<MerchantSettlementMethodValue>,
    pub enabled_networks: Vec<MerchantSettlementNetworkValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSettingsResponse {
    pub registration_enabled: bool,
    pub finance: SystemFinanceSettingsResponse,
    pub settlement: MerchantSettlementSettingsResponse,
    pub updated_at: Timestamp,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemFinanceSettingsResponse {
    pub withdrawal_minimum_usd: String,
    pub withdrawal_fee_percent: String,
    pub platform_fee_percent: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantSettlementSettingsResponse {
    pub enabled_methods: Vec<&'static str>,
    pub enabled_networks: Vec<&'static str>,
    pub updated_at: Timestamp,
}

impl From<SystemSettings> for SystemSettingsResponse {
    fn from(settings: SystemSettings) -> Self {
        Self {
            registration_enabled: settings.registration_enabled,
            finance: SystemFinanceSettingsResponse::from(settings.finance),
            settlement: MerchantSettlementSettingsResponse::from(settings.settlement),
            updated_at: settings.updated_at,
        }
    }
}

impl From<SystemFinanceSettings> for SystemFinanceSettingsResponse {
    fn from(settings: SystemFinanceSettings) -> Self {
        Self {
            withdrawal_minimum_usd: format_scaled(settings.withdrawal_minimum_microusd, 6, 2),
            withdrawal_fee_percent: format_scaled(i64::from(settings.withdrawal_fee_bps), 2, 2),
            platform_fee_percent: format_scaled(i64::from(settings.platform_fee_bps), 2, 2),
        }
    }
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

fn format_scaled(value: i64, decimal_places: usize, minimum_decimal_places: usize) -> String {
    let scale = 10_i64.pow(decimal_places as u32);
    let whole = value / scale;
    let mut fraction = format!("{:0decimal_places$}", value % scale);
    while fraction.len() > minimum_decimal_places && fraction.ends_with('0') {
        fraction.pop();
    }
    format!("{whole}.{fraction}")
}

#[cfg(test)]
#[path = "../../tests/unit/dto_system_settings.rs"]
mod tests;

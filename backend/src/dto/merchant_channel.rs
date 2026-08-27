use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{Brand, MerchantChannel, MerchantChannelStatus};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantChannelProviderResponse {
    pub id: String,
    pub name: String,
}

impl From<Brand> for MerchantChannelProviderResponse {
    fn from(brand: Brand) -> Self {
        Self {
            id: brand.identifier,
            name: brand.name,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMerchantChannelRequest {
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatusValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantChannelRequest {
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatusValue,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantChannelStatusValue {
    Active,
    Offline,
}

impl From<MerchantChannelStatusValue> for MerchantChannelStatus {
    fn from(status: MerchantChannelStatusValue) -> Self {
        match status {
            MerchantChannelStatusValue::Active => Self::Active,
            MerchantChannelStatusValue::Offline => Self::Offline,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantChannelResponse {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub provider: String,
    pub status: &'static str,
    pub model_count: u64,
    pub success_rate: f64,
    pub latency_ms: u64,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl From<MerchantChannel> for MerchantChannelResponse {
    fn from(channel: MerchantChannel) -> Self {
        Self {
            id: channel.id,
            name: channel.name,
            provider_id: channel.provider_id,
            provider: channel.provider,
            status: channel.status.as_str(),
            model_count: channel.model_count,
            success_rate: f64::from(channel.success_rate_basis_points) / 100.0,
            latency_ms: channel.average_latency_ms,
            created_at: channel.created_at,
            updated_at: channel.updated_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_channel.rs"]
mod tests;

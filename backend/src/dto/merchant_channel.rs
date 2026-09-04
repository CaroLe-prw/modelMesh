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
    pub api_key: String,
    #[serde(default)]
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub name: String,
    pub provider_id: String,
    pub supported_models: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantChannelRequest {
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatusValue,
    pub supported_models: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverMerchantChannelModelsRequest {
    #[serde(default)]
    pub api_key: Option<String>,
    pub base_url: String,
    #[serde(default)]
    pub channel_id: Option<String>,
    pub provider_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverMerchantChannelModelsResponse {
    pub models: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantChannelStatusRequest {
    pub status: MerchantChannelStatusValue,
    #[serde(default)]
    pub reason: String,
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
    pub api_key_configured: bool,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub channel_id: i64,
    pub description: String,
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub provider: String,
    pub status: &'static str,
    pub supported_models: Vec<String>,
    pub review_note: String,
    pub model_count: u64,
    pub success_rate: f64,
    pub latency_ms: u64,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl From<MerchantChannel> for MerchantChannelResponse {
    fn from(channel: MerchantChannel) -> Self {
        Self {
            api_key_configured: !channel.api_key_ciphertext.is_empty(),
            available_models: channel.available_models,
            base_url: channel.base_url,
            channel_id: channel.public_id,
            description: channel.description,
            id: channel.id,
            name: channel.name,
            provider_id: channel.provider_id,
            provider: channel.provider,
            status: channel.status.as_str(),
            supported_models: channel.supported_models,
            review_note: channel.review_note,
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

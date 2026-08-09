use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{ApiKey, ApiKeyStatus},
    dto::PaginationQuery,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListApiKeysQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub status: Option<ApiKeyStatusValue>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub custom_key: Option<String>,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_usd: f64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateApiKeyRequest {
    pub name: String,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_usd: f64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyStatusRequest {
    pub status: ApiKeyStatusValue,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiKeyStatusValue {
    Active,
    Paused,
}

impl From<ApiKeyStatusValue> for ApiKeyStatus {
    fn from(status: ApiKeyStatusValue) -> Self {
        match status {
            ApiKeyStatusValue::Active => Self::Active,
            ApiKeyStatusValue::Paused => Self::Paused,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyResponse {
    pub id: String,
    pub name: String,
    pub masked_key: String,
    pub status: &'static str,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_usd: f64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub five_hour_usage_usd: f64,
    pub daily_usage_usd: f64,
    pub weekly_usage_usd: f64,
    pub expires_at: Option<Timestamp>,
    pub last_used_at: Option<Timestamp>,
    pub last_used_ip: Option<String>,
    pub created_at: Timestamp,
    pub concurrency: u32,
    pub usage_today: f64,
    pub usage_last_30_days: f64,
}

impl From<ApiKey> for ApiKeyResponse {
    fn from(api_key: ApiKey) -> Self {
        Self {
            id: api_key.id,
            name: api_key.name,
            masked_key: format!("{}••••{}", api_key.key_prefix, api_key.key_suffix),
            status: api_key.status.as_str(),
            ip_restriction_enabled: api_key.ip_restriction_enabled,
            ip_whitelist: api_key.ip_whitelist,
            ip_blacklist: api_key.ip_blacklist,
            quota_limit_usd: microusd_to_usd(api_key.quota_limit_microusd),
            rate_limit_enabled: api_key.rate_limit_enabled,
            five_hour_limit_usd: microusd_to_usd(api_key.five_hour_limit_microusd),
            daily_limit_usd: microusd_to_usd(api_key.daily_limit_microusd),
            weekly_limit_usd: microusd_to_usd(api_key.weekly_limit_microusd),
            five_hour_usage_usd: 0.0,
            daily_usage_usd: 0.0,
            weekly_usage_usd: 0.0,
            expires_at: api_key.expires_at,
            last_used_at: api_key.last_used_at,
            last_used_ip: api_key.last_used_ip,
            created_at: api_key.created_at,
            concurrency: 0,
            usage_today: 0.0,
            usage_last_30_days: 0.0,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateApiKeyResponse {
    pub api_key: ApiKeyResponse,
    pub plain_text_key: String,
}

fn microusd_to_usd(value: i64) -> f64 {
    value as f64 / 1_000_000.0
}

use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{ModelPriceReviewSettings, PriceConfiguration, PriceSettings};

const PRICE_NANO_SCALE: f64 = 100_000_000.0;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePriceSettingsRequest {
    pub rates: Vec<UpdatePriceSettingRequest>,
    pub review_policy: UpdatePriceReviewPolicyRequest,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePriceReviewPolicyRequest {
    pub approved_price_effective_delay_hours: i32,
    pub price_increase_review_threshold_percent: serde_json::Number,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePriceSettingRequest {
    pub price_currency: String,
    pub exchange_rate: serde_json::Number,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceSettingsResponse {
    pub rates: Vec<PriceSettingResponse>,
    pub review_policy: PriceReviewPolicyResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceReviewPolicyResponse {
    pub approved_price_effective_delay_hours: i32,
    pub price_increase_review_threshold_percent: f64,
    pub updated_at: Timestamp,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceSettingResponse {
    pub price_currency: &'static str,
    pub exchange_rate: f64,
    pub updated_at: Timestamp,
}

impl From<PriceConfiguration> for PriceSettingsResponse {
    fn from(settings: PriceConfiguration) -> Self {
        Self {
            rates: settings
                .rates
                .into_iter()
                .map(PriceSettingResponse::from)
                .collect(),
            review_policy: PriceReviewPolicyResponse::from(settings.review),
        }
    }
}

impl From<ModelPriceReviewSettings> for PriceReviewPolicyResponse {
    fn from(settings: ModelPriceReviewSettings) -> Self {
        Self {
            approved_price_effective_delay_hours: settings.approved_price_effective_delay_hours,
            price_increase_review_threshold_percent: settings.price_increase_review_threshold_bps
                as f64
                / 100.0,
            updated_at: settings.updated_at,
        }
    }
}

impl From<PriceSettings> for PriceSettingResponse {
    fn from(settings: PriceSettings) -> Self {
        Self {
            price_currency: settings.currency().as_str(),
            exchange_rate: settings.exchange_rate.nano_units_per_usd() as f64 / PRICE_NANO_SCALE,
            updated_at: settings.updated_at,
        }
    }
}

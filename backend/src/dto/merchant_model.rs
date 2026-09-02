use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{
    MerchantBillingMode, MerchantModel, MerchantModelOption, MerchantModelOptions,
};

use super::{
    model::ModelPriceOverrideRequest, model_catalog::ModelPricingResponse,
    price_settings::PriceSettingResponse,
};

const PRICE_NANO_SCALE: f64 = 100_000_000.0;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListMerchantModelOptionsQuery {
    pub channel_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMerchantModelRequest {
    pub channel_id: String,
    pub conversion_mode: MerchantPriceConversionModeValue,
    pub exchange_rate: serde_json::Number,
    pub model_id: i64,
    pub billing_mode: MerchantBillingModeValue,
    pub input_price: serde_json::Number,
    pub output_price: serde_json::Number,
    pub price_currency: String,
    #[serde(default)]
    pub price_overrides: Vec<ModelPriceOverrideRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantModelRequest {
    pub channel_id: String,
    pub conversion_mode: MerchantPriceConversionModeValue,
    pub exchange_rate: serde_json::Number,
    pub model_id: i64,
    pub billing_mode: MerchantBillingModeValue,
    pub input_price: serde_json::Number,
    pub output_price: serde_json::Number,
    pub price_currency: String,
    #[serde(default)]
    pub price_overrides: Vec<ModelPriceOverrideRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantModelStatusRequest {
    pub status: MerchantModelRuntimeStatusValue,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantModelRuntimeStatusValue {
    Offline,
    Published,
}

impl From<MerchantModelRuntimeStatusValue> for crate::domain::MerchantModelStatus {
    fn from(status: MerchantModelRuntimeStatusValue) -> Self {
        match status {
            MerchantModelRuntimeStatusValue::Offline => Self::Offline,
            MerchantModelRuntimeStatusValue::Published => Self::Published,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantPriceConversionModeValue {
    Parity,
    FixedRate,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantBillingModeValue {
    Token,
    Request,
}

impl From<MerchantBillingModeValue> for MerchantBillingMode {
    fn from(mode: MerchantBillingModeValue) -> Self {
        match mode {
            MerchantBillingModeValue::Token => Self::Token,
            MerchantBillingModeValue::Request => Self::Request,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantModelResponse {
    pub id: String,
    pub channel_id: String,
    pub channel_name: String,
    pub provider_id: String,
    pub model_id: i64,
    pub model_identifier: String,
    pub model_name: String,
    pub context_window: i64,
    pub billing_mode: &'static str,
    pub price_currency: &'static str,
    pub input_price: f64,
    pub output_price: f64,
    pub pricing: ModelPricingResponse,
    pub status: &'static str,
    pub review_status: &'static str,
    pub has_approved_price: bool,
    pub pending_price: Option<MerchantModelPendingPriceResponse>,
    pub review_note: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantModelPendingPriceResponse {
    pub billing_mode: &'static str,
    pub price_currency: &'static str,
    pub input_price: f64,
    pub output_price: f64,
    pub pricing: ModelPricingResponse,
    pub effective_at: Option<Timestamp>,
}

impl From<MerchantModel> for MerchantModelResponse {
    fn from(model: MerchantModel) -> Self {
        Self {
            id: model.id,
            channel_id: model.channel_id,
            channel_name: model.channel_name,
            provider_id: model.provider_id,
            model_id: model.model_id,
            model_identifier: model.model_identifier,
            model_name: model.model_name,
            context_window: model.context_window,
            billing_mode: model.billing_mode.as_str(),
            price_currency: model.price_currency.as_str(),
            input_price: price_from_nano(model.input_price_nano_per_million),
            output_price: price_from_nano(model.output_price_nano_per_million),
            pricing: ModelPricingResponse::from(model.pricing),
            status: model.status.as_str(),
            review_status: model.review_status.as_str(),
            has_approved_price: model.has_approved_price,
            pending_price: model
                .pending_price
                .map(|price| MerchantModelPendingPriceResponse {
                    billing_mode: price.billing_mode.as_str(),
                    price_currency: price.price_currency.as_str(),
                    input_price: price_from_nano(price.input_price_nano_per_million),
                    output_price: price_from_nano(price.output_price_nano_per_million),
                    pricing: ModelPricingResponse::from(price.pricing),
                    effective_at: price.effective_at,
                }),
            review_note: model.review_note,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantModelOptionResponse {
    pub id: i64,
    pub identifier: String,
    pub name: String,
    pub context_window: i64,
    pub default_billing_mode: &'static str,
    pub input_price: f64,
    pub output_price: f64,
    pub pricing: ModelPricingResponse,
}

impl From<MerchantModelOption> for MerchantModelOptionResponse {
    fn from(model: MerchantModelOption) -> Self {
        Self {
            id: model.id,
            identifier: model.identifier,
            name: model.name,
            context_window: model.context_window,
            default_billing_mode: model.default_billing_mode.as_str(),
            input_price: price_from_nano(model.input_price_nano_per_million),
            output_price: price_from_nano(model.output_price_nano_per_million),
            pricing: ModelPricingResponse::from(model.pricing),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantModelOptionsResponse {
    pub models: Vec<MerchantModelOptionResponse>,
    pub price_settings: Vec<PriceSettingResponse>,
}

impl From<MerchantModelOptions> for MerchantModelOptionsResponse {
    fn from(options: MerchantModelOptions) -> Self {
        Self {
            models: options
                .models
                .into_iter()
                .map(MerchantModelOptionResponse::from)
                .collect(),
            price_settings: options
                .price_settings
                .into_iter()
                .map(PriceSettingResponse::from)
                .collect(),
        }
    }
}

fn price_from_nano(value: i64) -> f64 {
    value as f64 / PRICE_NANO_SCALE
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_model.rs"]
mod tests;

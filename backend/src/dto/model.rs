use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{ManagedModel, ModelStatus},
    dto::PaginationQuery,
};

use super::model_catalog::ModelPricingResponse;

const PRICE_NANO_USD_SCALE: f64 = 100_000_000.0;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelsQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub brand_id: Option<String>,
    #[serde(default)]
    pub status: Option<ModelStatusValue>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateModelRequest {
    pub brand_id: String,
    pub identifier: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub context_window: Option<i64>,
    #[serde(default)]
    pub input_price: Option<f64>,
    #[serde(default)]
    pub cache_read_price: Option<f64>,
    #[serde(default)]
    pub cache_write_price: Option<f64>,
    #[serde(default)]
    pub output_price: Option<f64>,
    #[serde(default)]
    pub price_overrides: Vec<ModelPriceOverrideRequest>,
    pub status: ModelStatusValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateModelsRequest {
    pub brand_id: String,
    pub model_ids: Vec<String>,
    #[serde(default)]
    pub input_price: Option<f64>,
    #[serde(default)]
    pub cache_read_price: Option<f64>,
    #[serde(default)]
    pub cache_write_price: Option<f64>,
    #[serde(default)]
    pub output_price: Option<f64>,
    #[serde(default)]
    pub price_overrides: Vec<ModelPriceOverrideRequest>,
    pub status: ModelStatusValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateModelPricingRequest {
    #[serde(default)]
    pub price_overrides: Vec<ModelPriceOverrideRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPriceOverrideRequest {
    pub group: ModelPriceGroupRequest,
    pub rate: String,
    pub price: serde_json::Number,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ModelPriceGroupRequest {
    Base,
    ContextOver200k,
    Tier { tier_type: String, size: i64 },
    ExperimentalMode { mode: String },
    ServiceTier { tier: String },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatusRequest {
    pub status: ModelStatusValue,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ModelStatusValue {
    Published,
    Disabled,
}

impl From<ModelStatusValue> for ModelStatus {
    fn from(status: ModelStatusValue) -> Self {
        match status {
            ModelStatusValue::Published => Self::Published,
            ModelStatusValue::Disabled => Self::Disabled,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelResponse {
    pub brand_id: String,
    pub id: i64,
    pub identifier: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub catalog_source: Option<String>,
    pub context_window: i64,
    pub input_price: f64,
    pub input_price_overridden: bool,
    pub cache_read_price: f64,
    pub cache_read_price_overridden: bool,
    pub cache_write_price: f64,
    pub cache_write_price_overridden: bool,
    pub output_price: f64,
    pub output_price_overridden: bool,
    pub default_pricing: ModelPricingResponse,
    pub pricing_overrides: ModelPricingResponse,
    pub pricing: ModelPricingResponse,
    pub merchant_count: u64,
    pub status: &'static str,
    pub updated_at: Timestamp,
}

impl From<ManagedModel> for ModelResponse {
    fn from(model: ManagedModel) -> Self {
        let effective_pricing = model.default_pricing.merged_with(&model.pricing_overrides);
        Self {
            brand_id: model.brand_identifier,
            id: model.id,
            identifier: model.identifier,
            name: model.name,
            catalog_source: model.catalog_source,
            context_window: model.context_window,
            input_price: price_from_nano_usd(model.input_price_nano_usd_per_million),
            input_price_overridden: model.input_price_overridden,
            cache_read_price: price_from_nano_usd(model.cache_read_price_nano_usd_per_million),
            cache_read_price_overridden: model.cache_read_price_overridden,
            cache_write_price: price_from_nano_usd(model.cache_write_price_nano_usd_per_million),
            cache_write_price_overridden: model.cache_write_price_overridden,
            output_price: price_from_nano_usd(model.output_price_nano_usd_per_million),
            output_price_overridden: model.output_price_overridden,
            default_pricing: ModelPricingResponse::from(model.default_pricing),
            pricing_overrides: ModelPricingResponse::from(model.pricing_overrides),
            pricing: ModelPricingResponse::from(effective_pricing),
            merchant_count: model.merchant_count,
            status: model.status.as_str(),
            updated_at: model.updated_at,
        }
    }
}

fn price_from_nano_usd(value: i64) -> f64 {
    value as f64 / PRICE_NANO_USD_SCALE
}

#[cfg(test)]
#[path = "../../tests/unit/dto_model.rs"]
mod tests;

use std::collections::BTreeMap;

use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{ModelCatalogEntry, ModelPriceRates, ModelPricing};

const PRICE_NANO_USD_SCALE: f64 = 100_000_000.0;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogLookupQuery {
    pub brand_id: String,
    pub model_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogListQuery {
    pub brand_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogEntryResponse {
    pub provider_id: String,
    pub model_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_window: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_read_price: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_write_price: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_price: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_price: Option<f64>,
    pub pricing: ModelPricingResponse,
    pub source: &'static str,
    pub synced_at: Timestamp,
}

impl From<ModelCatalogEntry> for ModelCatalogEntryResponse {
    fn from(entry: ModelCatalogEntry) -> Self {
        Self {
            provider_id: entry.provider_id,
            model_id: entry.model_id,
            name: entry.model_name,
            context_window: entry.context_window,
            cache_read_price: entry
                .cache_read_price_nano_usd_per_million
                .map(price_from_nano_usd),
            cache_write_price: entry
                .cache_write_price_nano_usd_per_million
                .map(price_from_nano_usd),
            input_price: entry
                .input_price_nano_usd_per_million
                .map(price_from_nano_usd),
            output_price: entry
                .output_price_nano_usd_per_million
                .map(price_from_nano_usd),
            pricing: ModelPricingResponse::from(entry.pricing),
            source: "models.dev",
            synced_at: entry.source_synced_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPricingResponse {
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub base: BTreeMap<String, f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_over_200k: Option<BTreeMap<String, f64>>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tiers: Vec<ModelPriceTierResponse>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub experimental_modes: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub service_tiers: BTreeMap<String, BTreeMap<String, f64>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPriceTierResponse {
    pub tier_type: String,
    pub size: i64,
    pub rates: BTreeMap<String, f64>,
}

impl From<ModelPricing> for ModelPricingResponse {
    fn from(pricing: ModelPricing) -> Self {
        Self {
            base: price_rates_from_nano_usd(pricing.base),
            context_over_200k: pricing.context_over_200k.map(price_rates_from_nano_usd),
            tiers: pricing
                .tiers
                .into_iter()
                .map(|tier| ModelPriceTierResponse {
                    tier_type: tier.tier_type,
                    size: tier.size,
                    rates: price_rates_from_nano_usd(tier.rates),
                })
                .collect(),
            experimental_modes: pricing
                .experimental_modes
                .into_iter()
                .map(|(name, rates)| (name, price_rates_from_nano_usd(rates)))
                .collect(),
            service_tiers: pricing
                .service_tiers
                .into_iter()
                .map(|(name, rates)| (name, price_rates_from_nano_usd(rates)))
                .collect(),
        }
    }
}

fn price_rates_from_nano_usd(rates: ModelPriceRates) -> BTreeMap<String, f64> {
    rates
        .into_iter()
        .map(|(name, value)| (name, price_from_nano_usd(value)))
        .collect()
}

fn price_from_nano_usd(value: i64) -> f64 {
    value as f64 / PRICE_NANO_USD_SCALE
}

#[cfg(test)]
#[path = "../../tests/unit/dto_model_catalog.rs"]
mod tests;

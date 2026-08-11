use jiff::Timestamp;
use serde_json::Value;

use super::ModelPricing;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ModelCatalogEntry {
    pub provider_id: String,
    pub model_id: String,
    pub model_name: String,
    pub context_window: Option<i64>,
    pub cache_read_price_nano_usd_per_million: Option<i64>,
    pub cache_write_price_nano_usd_per_million: Option<i64>,
    pub input_price_nano_usd_per_million: Option<i64>,
    pub output_price_nano_usd_per_million: Option<i64>,
    pub pricing: ModelPricing,
    pub source_data: Value,
    pub source_synced_at: Timestamp,
}

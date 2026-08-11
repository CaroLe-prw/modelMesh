use crate::domain::{ModelCatalogEntry, ModelPricing};
use serde_json::json;

use super::ModelCatalogEntryResponse;

#[test]
fn catalog_response_exposes_usd_per_million_prices() {
    let response = ModelCatalogEntryResponse::from(ModelCatalogEntry {
        provider_id: "openai".to_owned(),
        model_id: "gpt-test".to_owned(),
        model_name: "GPT Test".to_owned(),
        context_window: Some(128_000),
        cache_read_price_nano_usd_per_million: Some(12_500_000),
        cache_write_price_nano_usd_per_million: Some(150_000_000),
        input_price_nano_usd_per_million: Some(125_000_000),
        output_price_nano_usd_per_million: Some(1_000_000_000),
        pricing: ModelPricing {
            base: [
                ("input".to_owned(), 125_000_000),
                ("output".to_owned(), 1_000_000_000),
                ("reasoning".to_owned(), 1_500_000_000),
            ]
            .into(),
            ..Default::default()
        },
        source_data: json!({}),
        source_synced_at: "2026-08-10T07:00:00Z"
            .parse()
            .expect("timestamp should be valid"),
    });

    assert_eq!(response.cache_read_price, Some(0.125));
    assert_eq!(response.cache_write_price, Some(1.5));
    assert_eq!(response.input_price, Some(1.25));
    assert_eq!(response.output_price, Some(10.0));
    assert_eq!(response.pricing.base["reasoning"], 15.0);
    assert_eq!(response.source, "models.dev");
}

use crate::domain::{ModelCatalogEntry, ModelCatalogOption, ModelPriceTier, ModelPricing};
use serde_json::json;

use super::{ModelCatalogEntryResponse, ModelCatalogOptionResponse};

#[test]
fn catalog_option_response_contains_only_selection_fields() {
    let response = ModelCatalogOptionResponse::from(ModelCatalogOption {
        model_id: "gpt-test".to_owned(),
        model_name: "GPT Test".to_owned(),
    });

    assert_eq!(
        serde_json::to_value(response).expect("catalog option should serialize"),
        json!({ "modelId": "gpt-test", "name": "GPT Test" })
    );
}

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
            experimental_mode_tiers: [(
                "fast".to_owned(),
                vec![ModelPriceTier {
                    tier_type: "context".to_owned(),
                    size: 272_000,
                    rates: [("output".to_owned(), 6_000_000_000)].into(),
                }],
            )]
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
    assert_eq!(
        response.pricing.experimental_mode_tiers["fast"][0].rates["output"],
        60.0
    );
    assert_eq!(response.source, "models.dev");
}

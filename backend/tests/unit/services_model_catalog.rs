use crate::clients::ModelsDevCatalogEntry;
use serde_json::{Number, json};

use super::{
    normalize_catalog, normalize_identifier, normalize_model_id, price_number_to_nano_usd,
};

#[test]
fn model_catalog_lookup_is_case_insensitive_for_brand_but_preserves_model_id() {
    assert_eq!(
        normalize_identifier(" OpenAI ".to_owned()).expect("brand should normalize"),
        "openai"
    );
    assert_eq!(
        normalize_model_id(" MiniMax-M2.5 ".to_owned()).expect("model should normalize"),
        "MiniMax-M2.5"
    );
}

#[test]
fn prices_are_stored_with_eight_decimal_places() {
    assert_eq!(
        price_number_to_nano_usd(&Number::from_f64(0.26666667).expect("valid number")),
        Some(26_666_667)
    );
    assert_eq!(
        price_number_to_nano_usd(&Number::from_f64(1.25).expect("valid number")),
        Some(125_000_000)
    );
    assert_eq!(
        price_number_to_nano_usd(&Number::from_f64(-1.0).expect("valid number")),
        None
    );
}

#[test]
fn catalog_normalization_drops_zero_context_and_keeps_free_prices() {
    let entries = normalize_catalog(vec![ModelsDevCatalogEntry {
        provider_id: "openai".to_owned(),
        model_id: "gpt-test".to_owned(),
        model_name: "GPT Test".to_owned(),
        context_window: Some(0),
        cache_read_price_usd_per_million: Some(0.0),
        cache_write_price_usd_per_million: Some(0.5),
        input_price_usd_per_million: Some(0.0),
        output_price_usd_per_million: Some(0.0),
        raw_cost: Some(json!({
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0.5,
            "reasoning": 2,
            "input_audio": 3,
            "output_audio": 4,
            "context_over_200k": {
                "input": 1,
                "output": 2
            },
            "tiers": [{
                "input": 5,
                "output": 6,
                "tier": { "type": "context", "size": 272000 }
            }]
        })),
        source_data: json!({
            "id": "gpt-test",
            "name": "GPT Test",
            "experimental": {
                "modes": {
                    "fast": { "cost": { "input": 10, "output": 20 } }
                }
            }
        }),
    }])
    .expect("catalog should normalize");

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].context_window, None);
    assert_eq!(entries[0].cache_read_price_nano_usd_per_million, Some(0));
    assert_eq!(
        entries[0].cache_write_price_nano_usd_per_million,
        Some(50_000_000)
    );
    assert_eq!(entries[0].input_price_nano_usd_per_million, Some(0));
    assert_eq!(entries[0].output_price_nano_usd_per_million, Some(0));
    assert_eq!(entries[0].pricing_nano_usd.base["reasoning"], 200_000_000);
    assert_eq!(entries[0].pricing_nano_usd.base["input_audio"], 300_000_000);
    assert_eq!(
        entries[0].pricing_nano_usd.base["output_audio"],
        400_000_000
    );
    assert!(entries[0].pricing_nano_usd.context_over_200k.is_none());
    assert_eq!(entries[0].pricing_nano_usd.tiers[0].size, 272_000);
    assert_eq!(
        entries[0].pricing_nano_usd.experimental_modes["fast"]["output"],
        2_000_000_000
    );
}

#[test]
fn catalog_normalization_keeps_legacy_context_price_only_without_tiers() {
    let entries = normalize_catalog(vec![ModelsDevCatalogEntry {
        provider_id: "anthropic".to_owned(),
        model_id: "claude-test".to_owned(),
        model_name: "Claude Test".to_owned(),
        context_window: Some(200_000),
        cache_read_price_usd_per_million: None,
        cache_write_price_usd_per_million: None,
        input_price_usd_per_million: Some(3.0),
        output_price_usd_per_million: Some(15.0),
        raw_cost: Some(json!({
            "input": 3,
            "output": 15,
            "context_over_200k": {
                "input": 6,
                "output": 22.5
            }
        })),
        source_data: json!({
            "id": "claude-test",
            "name": "Claude Test"
        }),
    }])
    .expect("legacy catalog price should normalize");

    let legacy_price = entries[0]
        .pricing_nano_usd
        .context_over_200k
        .as_ref()
        .expect("legacy context price should remain as a fallback");
    assert_eq!(legacy_price["input"], 600_000_000);
    assert_eq!(legacy_price["output"], 2_250_000_000);
    assert!(entries[0].pricing_nano_usd.tiers.is_empty());
}

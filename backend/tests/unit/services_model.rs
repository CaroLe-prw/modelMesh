use crate::domain::{ModelBillingMode, ModelCatalogEntry, ModelPricing, ModelStatus};
use serde_json::json;

use super::{
    CreateCatalogModels, CreateModel, DEFAULT_CUSTOM_CONTEXT_WINDOW, ModelPriceGroupInput,
    ModelPriceOverrideInput, ModelServiceError, build_search_pattern,
    resolve_catalog_model_records, resolve_new_model, resolve_price, validate_sort_order,
};

#[test]
fn model_search_escapes_sql_like_wildcards() {
    assert_eq!(
        build_search_pattern(Some(" 100%_GPT ".to_owned())),
        Ok(Some("%100\\%\\_GPT%".to_owned()))
    );
}

#[test]
fn model_search_rejects_control_characters() {
    assert_eq!(
        build_search_pattern(Some("gpt\n5".to_owned())),
        Err(ModelServiceError::InvalidInput)
    );
}

#[test]
fn batch_models_keep_individual_defaults_and_share_only_entered_overrides() {
    let records = resolve_catalog_model_records(
        CreateCatalogModels {
            brand_identifier: "openai".to_owned(),
            model_identifiers: vec!["model-a".to_owned(), "model-b".to_owned()],
            billing_mode: ModelBillingMode::Token,
            input_price: Some(9.0),
            cache_read_price: None,
            cache_write_price: None,
            output_price: None,
            price_overrides: Vec::new(),
            sort_order: 30,
            status: ModelStatus::Published,
        },
        vec![
            catalog_entry("model-a", 100_000_000, 1_000_000_000),
            catalog_entry("model-b", 200_000_000, 2_000_000_000),
        ],
    )
    .expect("catalog batch should resolve");

    assert_eq!(records.len(), 2);
    assert_eq!(
        records[0].default_pricing_nano_usd.base["input"],
        100_000_000
    );
    assert_eq!(
        records[1].default_pricing_nano_usd.base["input"],
        200_000_000
    );
    assert_eq!(records[0].input_price_nano_usd_per_million, 900_000_000);
    assert_eq!(records[1].input_price_nano_usd_per_million, 900_000_000);
    assert!(records.iter().all(|record| record.input_price_overridden));
    assert_eq!(records[0].output_price_nano_usd_per_million, 1_000_000_000);
    assert_eq!(records[1].output_price_nano_usd_per_million, 2_000_000_000);
    assert!(records.iter().all(|record| !record.output_price_overridden));
    assert!(records.iter().all(|record| record.sort_order == 30));
}

#[test]
fn batch_models_reject_duplicate_identifiers_case_insensitively() {
    let result = resolve_catalog_model_records(
        CreateCatalogModels {
            brand_identifier: "openai".to_owned(),
            model_identifiers: vec!["model-a".to_owned(), "MODEL-A".to_owned()],
            billing_mode: ModelBillingMode::Token,
            input_price: None,
            cache_read_price: None,
            cache_write_price: None,
            output_price: None,
            price_overrides: Vec::new(),
            sort_order: 0,
            status: ModelStatus::Published,
        },
        vec![catalog_entry("model-a", 100_000_000, 1_000_000_000)],
    );

    assert!(matches!(result, Err(ModelServiceError::InvalidInput)));
}

fn catalog_entry(model_id: &str, input: i64, output: i64) -> ModelCatalogEntry {
    ModelCatalogEntry {
        provider_id: "openai".to_owned(),
        model_id: model_id.to_owned(),
        model_name: model_id.to_owned(),
        context_window: Some(128_000),
        cache_read_price_nano_usd_per_million: None,
        cache_write_price_nano_usd_per_million: None,
        input_price_nano_usd_per_million: Some(input),
        output_price_nano_usd_per_million: Some(output),
        pricing: ModelPricing {
            base: [("input".to_owned(), input), ("output".to_owned(), output)].into(),
            ..Default::default()
        },
        source_data: json!({}),
        source_synced_at: "2026-08-10T07:00:00Z"
            .parse()
            .expect("timestamp should be valid"),
    }
}

#[test]
fn missing_manual_price_uses_catalog_default_without_override() {
    let price = resolve_price(None, Some(125_000_000)).expect("catalog price should be valid");

    assert_eq!(price.value, 125_000_000);
    assert!(!price.overridden);
}

#[test]
fn missing_manual_and_catalog_price_defaults_to_zero() {
    let price = resolve_price(None, None).expect("missing price should default to zero");

    assert_eq!(price.value, 0);
    assert!(!price.overridden);
}

#[test]
fn manual_price_overrides_catalog_default() {
    let price = resolve_price(Some(1.25), Some(50_000_000)).expect("manual price should be valid");

    assert_eq!(price.value, 125_000_000);
    assert!(price.overridden);
}

#[test]
fn negative_manual_price_is_rejected() {
    assert_eq!(
        resolve_price(Some(-0.01), Some(50_000_000)),
        Err(ModelServiceError::InvalidInput)
    );
}

#[test]
fn official_model_keeps_catalog_identity_and_tracks_price_sources_per_field() {
    let record = resolve_new_model(
        "openai".to_owned(),
        CreateModel {
            brand_identifier: "openai".to_owned(),
            identifier: "GPT-TEST".to_owned(),
            name: Some("A name supplied by the browser".to_owned()),
            context_window: Some(64_000),
            billing_mode: ModelBillingMode::Token,
            input_price: None,
            cache_read_price: None,
            cache_write_price: Some(2.5),
            output_price: Some(12.0),
            price_overrides: vec![
                ModelPriceOverrideInput {
                    group: ModelPriceGroupInput::Base,
                    rate: "reasoning".to_owned(),
                    price: "15".to_owned(),
                },
                ModelPriceOverrideInput {
                    group: ModelPriceGroupInput::ServiceTier {
                        tier: "priority".to_owned(),
                    },
                    rate: "input".to_owned(),
                    price: "10".to_owned(),
                },
            ],
            sort_order: 20,
            status: ModelStatus::Published,
        },
        Some(ModelCatalogEntry {
            provider_id: "openai".to_owned(),
            model_id: "gpt-test".to_owned(),
            model_name: "GPT Test Official".to_owned(),
            context_window: Some(1_050_000),
            cache_read_price_nano_usd_per_million: Some(12_500_000),
            cache_write_price_nano_usd_per_million: Some(150_000_000),
            input_price_nano_usd_per_million: Some(125_000_000),
            output_price_nano_usd_per_million: Some(1_000_000_000),
            pricing: ModelPricing {
                base: [
                    ("input".to_owned(), 125_000_000),
                    ("cache_read".to_owned(), 12_500_000),
                    ("cache_write".to_owned(), 150_000_000),
                    ("output".to_owned(), 1_000_000_000),
                    ("reasoning".to_owned(), 1_000_000_000),
                ]
                .into(),
                ..Default::default()
            },
            source_data: json!({}),
            source_synced_at: "2026-08-10T07:00:00Z"
                .parse()
                .expect("timestamp should be valid"),
        }),
    )
    .expect("official model should resolve");

    assert_eq!(record.identifier, "gpt-test");
    assert_eq!(record.name, "GPT Test Official");
    assert_eq!(record.catalog_source.as_deref(), Some("models.dev"));
    assert_eq!(record.context_window, 1_050_000);
    assert_eq!(record.sort_order, 20);
    assert_eq!(record.input_price_nano_usd_per_million, 125_000_000);
    assert!(!record.input_price_overridden);
    assert_eq!(record.cache_read_price_nano_usd_per_million, 12_500_000);
    assert!(!record.cache_read_price_overridden);
    assert_eq!(record.cache_write_price_nano_usd_per_million, 250_000_000);
    assert!(record.cache_write_price_overridden);
    assert_eq!(record.output_price_nano_usd_per_million, 1_200_000_000);
    assert!(record.output_price_overridden);
    assert_eq!(
        record.default_pricing_nano_usd.base["reasoning"],
        1_000_000_000
    );
    assert_eq!(
        record.pricing_overrides_nano_usd.base["reasoning"],
        1_500_000_000
    );
    assert_eq!(
        record.pricing_overrides_nano_usd.service_tiers["priority"]["input"],
        1_000_000_000
    );
}

#[test]
fn custom_model_uses_backend_context_default_when_the_browser_omits_it() {
    let record = resolve_new_model(
        "custom".to_owned(),
        CreateModel {
            brand_identifier: "custom".to_owned(),
            identifier: "custom-model".to_owned(),
            name: Some("Custom Model".to_owned()),
            context_window: None,
            billing_mode: ModelBillingMode::Token,
            input_price: None,
            cache_read_price: None,
            cache_write_price: None,
            output_price: None,
            price_overrides: Vec::new(),
            sort_order: 0,
            status: ModelStatus::Published,
        },
        None,
    )
    .expect("custom model should use the backend default");

    assert_eq!(record.context_window, DEFAULT_CUSTOM_CONTEXT_WINDOW);
}

#[test]
fn custom_model_stores_submitted_pricing_as_its_default_price_book() {
    let record = resolve_new_model(
        "custom".to_owned(),
        CreateModel {
            brand_identifier: "custom".to_owned(),
            identifier: "custom-model".to_owned(),
            name: Some("Custom Model".to_owned()),
            context_window: None,
            billing_mode: ModelBillingMode::Token,
            input_price: None,
            cache_read_price: None,
            cache_write_price: None,
            output_price: None,
            price_overrides: vec![ModelPriceOverrideInput {
                group: ModelPriceGroupInput::Base,
                rate: "input".to_owned(),
                price: "1.25".to_owned(),
            }],
            sort_order: 0,
            status: ModelStatus::Published,
        },
        None,
    )
    .expect("custom model should resolve its baseline pricing");

    assert_eq!(record.default_pricing_nano_usd.base["input"], 125_000_000);
    assert!(record.pricing_overrides_nano_usd.base.is_empty());
    assert_eq!(record.input_price_nano_usd_per_million, 125_000_000);
    assert!(!record.input_price_overridden);
}

#[test]
fn request_billed_model_requires_and_stores_one_fixed_price() {
    let request_prices = [("request", "0.04")];
    let request = |prices: &[(&str, &str)]| CreateModel {
        brand_identifier: "openai".to_owned(),
        identifier: "gpt-image-test".to_owned(),
        name: Some("GPT Image Test".to_owned()),
        context_window: None,
        billing_mode: ModelBillingMode::Request,
        input_price: None,
        cache_read_price: None,
        cache_write_price: None,
        output_price: None,
        price_overrides: prices
            .iter()
            .map(|(rate, price)| ModelPriceOverrideInput {
                group: ModelPriceGroupInput::Base,
                rate: (*rate).to_owned(),
                price: (*price).to_owned(),
            })
            .collect(),
        sort_order: 0,
        status: ModelStatus::Published,
    };

    let record = resolve_new_model("openai".to_owned(), request(&request_prices), None)
        .expect("fixed request pricing should resolve");
    assert_eq!(record.billing_mode, ModelBillingMode::Request);
    assert_eq!(record.default_pricing_nano_usd.base["request"], 4_000_000);
    assert_eq!(record.input_price_nano_usd_per_million, 0);
    assert_eq!(record.output_price_nano_usd_per_million, 0);

    assert!(matches!(
        resolve_new_model("openai".to_owned(), request(&[]), None),
        Err(ModelServiceError::InvalidInput)
    ));
}

#[test]
fn model_sort_order_cannot_be_negative() {
    assert_eq!(validate_sort_order(0), Ok(()));
    assert_eq!(
        validate_sort_order(-1),
        Err(ModelServiceError::InvalidInput)
    );
}

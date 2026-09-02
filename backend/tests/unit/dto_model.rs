use crate::domain::{ManagedModel, ModelBillingMode, ModelPricing, ModelStatus, SortDirection};
use serde_json::json;

use super::{ListModelsQuery, ModelResponse};

#[test]
fn model_list_sort_direction_defaults_to_ascending_and_accepts_descending() {
    let default_query = serde_json::from_value::<ListModelsQuery>(json!({}))
        .expect("default model list query should deserialize");
    let descending_query = serde_json::from_value::<ListModelsQuery>(json!({
        "sortDirection": "desc"
    }))
    .expect("descending model list query should deserialize");

    assert_eq!(
        SortDirection::from(default_query.sort_direction),
        SortDirection::Asc
    );
    assert_eq!(
        SortDirection::from(descending_query.sort_direction),
        SortDirection::Desc
    );
}

#[test]
fn response_separates_database_id_from_official_identifier() {
    let response = ModelResponse::from(ManagedModel {
        id: 42,
        brand_identifier: "deepseek".to_owned(),
        identifier: "deepseek-v4-flash".to_owned(),
        name: "DeepSeek V4 Flash".to_owned(),
        catalog_source: Some("models.dev".to_owned()),
        context_window: 1_000_000,
        billing_mode: ModelBillingMode::Token,
        input_price_nano_usd_per_million: 14_000_000,
        input_price_overridden: false,
        cache_read_price_nano_usd_per_million: 280_000,
        cache_read_price_overridden: false,
        cache_write_price_nano_usd_per_million: 0,
        cache_write_price_overridden: false,
        output_price_nano_usd_per_million: 28_000_000,
        output_price_overridden: false,
        default_pricing: ModelPricing::default(),
        pricing_overrides: ModelPricing::default(),
        merchant_count: 0,
        sort_order: 30,
        status: ModelStatus::Published,
        updated_at: "2026-08-10T10:28:08Z"
            .parse()
            .expect("timestamp should be valid"),
    });

    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["id"], json!(42));
    assert_eq!(value["identifier"], json!("deepseek-v4-flash"));
    assert_eq!(value["sortOrder"], json!(30));
}

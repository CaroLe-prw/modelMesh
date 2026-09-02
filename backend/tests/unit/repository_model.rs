use sea_orm::{DatabaseBackend, QueryTrait};

use crate::domain::{ModelStatus, SortDirection};

use super::{ModelSearch, model_list_query};

#[test]
fn list_query_filters_model_brand_and_status_with_stable_sorting() {
    let query = model_list_query(&ModelSearch {
        pattern: Some("%gpt\\_%".to_owned()),
        brand_identifier: Some("openai".to_owned()),
        status: Some(ModelStatus::Published),
        sort_direction: SortDirection::Asc,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains("ILIKE"));
    assert!(query.contains(r#""models"."name""#));
    assert!(query.contains(r#""models"."identifier""#));
    assert!(query.contains(r#""brands"."name""#));
    assert!(query.contains(r#""brands"."identifier""#));
    assert!(query.contains(r#""models"."status""#));
    assert!(query.contains(r#"ORDER BY "brands"."sort_order" ASC"#));
    assert!(query.contains(r#""models"."sort_order" ASC"#));
    assert!(query.contains(r#""models"."name" ASC"#));
    assert!(query.contains(r#""models"."id" ASC"#));
}

#[test]
fn list_query_can_order_model_sort_values_descending() {
    let query = model_list_query(&ModelSearch {
        pattern: None,
        brand_identifier: None,
        status: None,
        sort_direction: SortDirection::Desc,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains(r#""models"."sort_order" DESC"#));
    assert!(query.contains(r#""models"."name" ASC"#));
    assert!(query.contains(r#""models"."id" ASC"#));
}

use sea_orm::{DbBackend, QueryTrait};

use super::{
    live_listing_query, merchant_query, price_multiplier_basis_points, visible_model_query,
};

#[test]
fn visible_models_only_include_published_models_from_active_brands() {
    let sql = visible_model_query().build(DbBackend::Postgres).to_string();

    assert!(sql.contains(r#""models"."status" = 'published'"#), "{sql}");
    assert!(sql.contains(r#""brands"."status" = 'active'"#), "{sql}");
    assert!(
        sql.contains(r#"ORDER BY "brands"."sort_order" ASC"#),
        "{sql}"
    );
    assert!(sql.contains(r#""models"."sort_order" ASC"#), "{sql}");
    assert!(sql.contains(r#""models"."name" ASC"#), "{sql}");
}

#[test]
fn live_listings_require_approved_prices_and_active_channels() {
    let sql = live_listing_query().build(DbBackend::Postgres).to_string();

    for predicate in [
        r#""merchant_model_listings"."status" = 'published'"#,
        r#""merchant_model_listings"."review_status" = 'approved'"#,
        r#""merchant_model_listings"."has_approved_price" = TRUE"#,
        r#""merchant_channels"."status" = 'active'"#,
        r#""models"."status" = 'published'"#,
        r#""brands"."status" = 'active'"#,
    ] {
        assert!(sql.contains(predicate), "missing {predicate} in {sql}");
    }
}

#[test]
fn merchant_query_is_scoped_to_the_selected_model_and_stably_sorted() {
    let sql = merchant_query(42).build(DbBackend::Postgres).to_string();

    assert!(
        sql.contains(r#""merchant_model_listings"."model_id" = 42"#),
        "{sql}"
    );
    assert!(
        sql.contains(r#"ORDER BY "merchant_channels"."success_rate_basis_points" DESC"#),
        "{sql}"
    );
    assert!(
        sql.contains(r#""merchant_model_listings"."input_price_nano_per_million" ASC"#),
        "{sql}"
    );
}

#[test]
fn price_multiplier_uses_basis_points_with_rounding() {
    assert_eq!(price_multiplier_basis_points(13_000, 12_000), Some(10_833));
    assert_eq!(price_multiplier_basis_points(0, 12_000), Some(0));
    assert_eq!(price_multiplier_basis_points(12_000, 0), None);
}

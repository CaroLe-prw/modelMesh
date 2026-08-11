use sea_orm::{DatabaseBackend, QueryTrait};

use super::{UPDATE_DEFAULT_MODEL_PRICES_SQL, model_catalog_entry_lookup_query};

#[test]
fn model_catalog_lookup_uses_case_insensitive_exact_matching() {
    let query = model_catalog_entry_lookup_query("openai", "GPT-5_100%")
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(query.contains("LOWER"), "{query}");
    assert!(query.contains("= 'gpt-5_100%'"), "{query}");
    assert!(!query.contains("ILIKE"), "{query}");
    assert!(!query.contains("ESCAPE"), "{query}");
}

#[test]
fn catalog_refresh_updates_only_prices_without_manual_overrides() {
    for field in [
        "input_price_overridden",
        "cache_read_price_overridden",
        "cache_write_price_overridden",
        "output_price_overridden",
    ] {
        assert!(
            UPDATE_DEFAULT_MODEL_PRICES_SQL.contains(&format!("NOT managed.{field}")),
            "refresh query must guard {field}"
        );
    }
    assert!(UPDATE_DEFAULT_MODEL_PRICES_SQL.contains("managed.catalog_source = 'models.dev'"));
    assert!(
        UPDATE_DEFAULT_MODEL_PRICES_SQL
            .contains("default_pricing_nano_usd = payload.pricing_nano_usd")
    );
    assert!(
        UPDATE_DEFAULT_MODEL_PRICES_SQL
            .contains("context_window = COALESCE(payload.context_window, managed.context_window)")
    );
    assert!(!UPDATE_DEFAULT_MODEL_PRICES_SQL.contains("pricing_overrides_nano_usd ="));
    assert!(UPDATE_DEFAULT_MODEL_PRICES_SQL.contains("updated_at = NOW()"));
}

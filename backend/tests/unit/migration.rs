use sea_orm_migration::MigratorTrait;

use super::Migrator;

#[test]
fn migrations_are_registered_in_schema_order() {
    let names = Migrator::get_migration_files()
        .into_iter()
        .map(|migration| migration.name().to_owned())
        .collect::<Vec<_>>();

    assert_eq!(
        names,
        [
            "m0001_create_auth",
            "m0002_create_api_keys",
            "m0003_add_api_key_last_usage",
            "m0004_add_user_role",
            "m0005_create_app_routes",
            "m0006_seed_app_routes",
            "m0007_seed_merchant_routes",
            "m0008_seed_merchant_operations",
            "m0009_seed_admin_routes",
            "m0010_remove_admin_merchant_requests",
            "m0011_seed_admin_management_routes",
            "m0012_seed_admin_catalog_management",
            "m0013_create_brand_presets",
            "m0014_drop_brand_preset_search_terms",
            "m0015_create_brands",
            "m0016_create_model_catalog",
            "m0017_add_model_catalog_cache_prices",
            "m0018_create_models",
            "m0019_add_complete_model_pricing",
            "m0020_store_custom_model_default_pricing",
            "m0021_add_user_management",
            "m0022_add_user_activity",
            "m0023_repair_user_request_limits",
            "m0024_add_user_profile_fields",
            "m0025_create_user_balance_adjustments",
            "m0026_create_merchant_applications",
            "m0027_repair_merchant_application_avatar",
            "m0028_drop_obsolete_merchant_business_type",
            "m0029_add_merchant_application_code",
            "m0030_simplify_merchant_application_code",
            "m0031_separate_merchant_status",
        ]
    );
}

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
            "m0032_create_merchant_channels",
            "m0033_link_merchant_channels_to_brands",
            "m0034_create_merchant_model_listings",
            "m0035_add_merchant_model_pricing",
            "m0036_add_merchant_model_price_currency",
            "m0037_add_model_price_exchange_rate",
            "m0038_create_price_settings",
            "m0039_expand_price_settings",
            "m0040_ensure_default_usd_price_setting",
            "m0041_add_catalog_review_workflow",
            "m0042_require_channel_approval_before_activation",
            "m0043_add_catalog_review_notes",
            "m0044_add_merchant_channel_connection",
            "m0045_add_merchant_channel_public_id",
            "m0046_add_merchant_channel_available_models",
            "m0047_unify_merchant_channel_status",
            "m0048_add_merchant_model_rejected_status",
            "m0049_add_merchant_model_offline_status",
            "m0050_separate_model_review_and_price_effective_state",
            "m0051_create_merchant_requests",
            "m0052_create_merchant_resource_events",
            "m0053_guard_resource_events_during_user_deletion",
            "m0054_create_paginated_merchant_business_logs",
            "m0055_create_merchant_profiles",
            "m0056_expand_merchant_settlement_methods",
            "m0057_create_merchant_settlement_settings",
            "m0058_remove_wechat_settlement_option",
            "m0059_remove_wechat_settlement_schema",
            "m0060_consolidate_system_settings",
            "m0061_create_api_key_model_routes",
            "m0062_add_model_sort_order",
            "m0063_add_model_billing_mode",
            "m0064_add_merchant_model_billing_mode",
            "m0065_replace_image_pricing_with_fixed_request",
            "m0066_add_merchant_operation_audit",
            "m0067_create_merchant_withdrawals",
        ]
    );
}

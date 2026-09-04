mod m0001_create_auth;
mod m0002_create_api_keys;
mod m0003_add_api_key_last_usage;
mod m0004_add_user_role;
mod m0005_create_app_routes;
mod m0006_seed_app_routes;
mod m0007_seed_merchant_routes;
mod m0008_seed_merchant_operations;
mod m0009_seed_admin_routes;
mod m0010_remove_admin_merchant_requests;
mod m0011_seed_admin_management_routes;
mod m0012_seed_admin_catalog_management;
mod m0013_create_brand_presets;
mod m0014_drop_brand_preset_search_terms;
mod m0015_create_brands;
mod m0016_create_model_catalog;
mod m0017_add_model_catalog_cache_prices;
mod m0018_create_models;
mod m0019_add_complete_model_pricing;
mod m0020_store_custom_model_default_pricing;
mod m0021_add_user_management;
mod m0022_add_user_activity;
mod m0023_repair_user_request_limits;
mod m0024_add_user_profile_fields;
mod m0025_create_user_balance_adjustments;
mod m0026_create_merchant_applications;
mod m0027_repair_merchant_application_avatar;
mod m0028_drop_obsolete_merchant_business_type;
mod m0029_add_merchant_application_code;
mod m0030_simplify_merchant_application_code;
mod m0031_separate_merchant_status;
mod m0032_create_merchant_channels;
mod m0033_link_merchant_channels_to_brands;
mod m0034_create_merchant_model_listings;
mod m0035_add_merchant_model_pricing;
mod m0036_add_merchant_model_price_currency;
mod m0037_add_model_price_exchange_rate;
mod m0038_create_price_settings;
mod m0039_expand_price_settings;
mod m0040_ensure_default_usd_price_setting;
mod m0041_add_catalog_review_workflow;
mod m0042_require_channel_approval_before_activation;
mod m0043_add_catalog_review_notes;
mod m0044_add_merchant_channel_connection;
mod m0045_add_merchant_channel_public_id;
mod m0046_add_merchant_channel_available_models;
mod m0047_unify_merchant_channel_status;
mod m0048_add_merchant_model_rejected_status;
mod m0049_add_merchant_model_offline_status;
mod m0050_separate_model_review_and_price_effective_state;
mod m0051_create_merchant_requests;
mod m0052_create_merchant_resource_events;
mod m0053_guard_resource_events_during_user_deletion;
mod m0054_create_paginated_merchant_business_logs;
mod m0055_create_merchant_profiles;
mod m0056_expand_merchant_settlement_methods;
mod m0057_create_merchant_settlement_settings;
mod m0058_remove_wechat_settlement_option;
mod m0059_remove_wechat_settlement_schema;
mod m0060_consolidate_system_settings;
mod m0061_create_api_key_model_routes;
mod m0062_add_model_sort_order;
mod m0063_add_model_billing_mode;
mod m0064_add_merchant_model_billing_mode;
mod m0065_replace_image_pricing_with_fixed_request;
mod m0066_add_merchant_operation_audit;
mod m0067_create_merchant_withdrawals;

use sea_orm_migration::prelude::*;

pub struct Migrator;

#[sea_orm_migration::async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m0001_create_auth::Migration),
            Box::new(m0002_create_api_keys::Migration),
            Box::new(m0003_add_api_key_last_usage::Migration),
            Box::new(m0004_add_user_role::Migration),
            Box::new(m0005_create_app_routes::Migration),
            Box::new(m0006_seed_app_routes::Migration),
            Box::new(m0007_seed_merchant_routes::Migration),
            Box::new(m0008_seed_merchant_operations::Migration),
            Box::new(m0009_seed_admin_routes::Migration),
            Box::new(m0010_remove_admin_merchant_requests::Migration),
            Box::new(m0011_seed_admin_management_routes::Migration),
            Box::new(m0012_seed_admin_catalog_management::Migration),
            Box::new(m0013_create_brand_presets::Migration),
            Box::new(m0014_drop_brand_preset_search_terms::Migration),
            Box::new(m0015_create_brands::Migration),
            Box::new(m0016_create_model_catalog::Migration),
            Box::new(m0017_add_model_catalog_cache_prices::Migration),
            Box::new(m0018_create_models::Migration),
            Box::new(m0019_add_complete_model_pricing::Migration),
            Box::new(m0020_store_custom_model_default_pricing::Migration),
            Box::new(m0021_add_user_management::Migration),
            Box::new(m0022_add_user_activity::Migration),
            Box::new(m0023_repair_user_request_limits::Migration),
            Box::new(m0024_add_user_profile_fields::Migration),
            Box::new(m0025_create_user_balance_adjustments::Migration),
            Box::new(m0026_create_merchant_applications::Migration),
            Box::new(m0027_repair_merchant_application_avatar::Migration),
            Box::new(m0028_drop_obsolete_merchant_business_type::Migration),
            Box::new(m0029_add_merchant_application_code::Migration),
            Box::new(m0030_simplify_merchant_application_code::Migration),
            Box::new(m0031_separate_merchant_status::Migration),
            Box::new(m0032_create_merchant_channels::Migration),
            Box::new(m0033_link_merchant_channels_to_brands::Migration),
            Box::new(m0034_create_merchant_model_listings::Migration),
            Box::new(m0035_add_merchant_model_pricing::Migration),
            Box::new(m0036_add_merchant_model_price_currency::Migration),
            Box::new(m0037_add_model_price_exchange_rate::Migration),
            Box::new(m0038_create_price_settings::Migration),
            Box::new(m0039_expand_price_settings::Migration),
            Box::new(m0040_ensure_default_usd_price_setting::Migration),
            Box::new(m0041_add_catalog_review_workflow::Migration),
            Box::new(m0042_require_channel_approval_before_activation::Migration),
            Box::new(m0043_add_catalog_review_notes::Migration),
            Box::new(m0044_add_merchant_channel_connection::Migration),
            Box::new(m0045_add_merchant_channel_public_id::Migration),
            Box::new(m0046_add_merchant_channel_available_models::Migration),
            Box::new(m0047_unify_merchant_channel_status::Migration),
            Box::new(m0048_add_merchant_model_rejected_status::Migration),
            Box::new(m0049_add_merchant_model_offline_status::Migration),
            Box::new(m0050_separate_model_review_and_price_effective_state::Migration),
            Box::new(m0051_create_merchant_requests::Migration),
            Box::new(m0052_create_merchant_resource_events::Migration),
            Box::new(m0053_guard_resource_events_during_user_deletion::Migration),
            Box::new(m0054_create_paginated_merchant_business_logs::Migration),
            Box::new(m0055_create_merchant_profiles::Migration),
            Box::new(m0056_expand_merchant_settlement_methods::Migration),
            Box::new(m0057_create_merchant_settlement_settings::Migration),
            Box::new(m0058_remove_wechat_settlement_option::Migration),
            Box::new(m0059_remove_wechat_settlement_schema::Migration),
            Box::new(m0060_consolidate_system_settings::Migration),
            Box::new(m0061_create_api_key_model_routes::Migration),
            Box::new(m0062_add_model_sort_order::Migration),
            Box::new(m0063_add_model_billing_mode::Migration),
            Box::new(m0064_add_merchant_model_billing_mode::Migration),
            Box::new(m0065_replace_image_pricing_with_fixed_request::Migration),
            Box::new(m0066_add_merchant_operation_audit::Migration),
            Box::new(m0067_create_merchant_withdrawals::Migration),
        ]
    }
}

#[cfg(test)]
#[path = "../tests/unit/migration.rs"]
mod tests;

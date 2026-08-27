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
        ]
    }
}

#[cfg(test)]
#[path = "../tests/unit/migration.rs"]
mod tests;

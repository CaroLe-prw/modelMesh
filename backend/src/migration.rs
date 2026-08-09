mod m0001_create_auth;
mod m0002_create_api_keys;
mod m0003_add_api_key_last_usage;
mod m0004_add_user_role;
mod m0005_create_app_routes;

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
        ]
    }
}

#[cfg(test)]
#[path = "../tests/unit/migration.rs"]
mod tests;

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
        ]
    );
}

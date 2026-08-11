use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
INSERT INTO app_routes (route_key, path, label_key, icon_key, group_key, sort_order) VALUES
    ('merchant.dashboard', '/merchant/dashboard', 'pages.account.navigation.merchantCenter', 'layout-dashboard', 'merchant', 200),
    ('merchant.channels', '/merchant/channels', 'pages.account.navigation.channelManagement', 'radio-tower', 'merchant', 210),
    ('merchant.models', '/merchant/models', 'pages.account.navigation.modelListing', 'package-plus', 'merchant', 220),
    ('merchant.usage-logs', '/merchant/usage-logs', 'pages.account.navigation.merchantUsageLogs', 'scroll-text', 'merchant', 230)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, role
FROM app_routes
CROSS JOIN (VALUES ('merchant'), ('admin')) AS inherited_roles(role)
WHERE route_key IN (
    'merchant.dashboard',
    'merchant.channels',
    'merchant.models',
    'merchant.usage-logs'
)
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = 240,
    updated_at = NOW()
WHERE route_key = 'merchant.support';
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
DELETE FROM app_routes
WHERE route_key IN (
    'merchant.dashboard',
    'merchant.channels',
    'merchant.models',
    'merchant.usage-logs'
);

UPDATE app_routes
SET sort_order = 200,
    updated_at = NOW()
WHERE route_key = 'merchant.support';
"#,
            )
            .await?;

        Ok(())
    }
}

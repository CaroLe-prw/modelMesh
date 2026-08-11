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
    ('merchant.withdrawals', '/merchant/withdrawals', 'pages.account.navigation.merchantWithdrawals', 'wallet-cards', 'merchant', 240),
    ('merchant.requests', '/merchant/requests', 'pages.account.navigation.merchantRequests', 'clipboard-list', 'merchant', 250),
    ('merchant.profile', '/merchant/profile', 'pages.account.navigation.merchantProfile', 'building-2', 'merchant', 260)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, role
FROM app_routes
CROSS JOIN (VALUES ('merchant'), ('admin')) AS inherited_roles(role)
WHERE route_key IN (
    'merchant.withdrawals',
    'merchant.requests',
    'merchant.profile'
)
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = 270,
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
    'merchant.withdrawals',
    'merchant.requests',
    'merchant.profile'
);

UPDATE app_routes
SET sort_order = 240,
    updated_at = NOW()
WHERE route_key = 'merchant.support';
"#,
            )
            .await?;

        Ok(())
    }
}

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
    ('admin.users', '/admin/users', 'pages.account.navigation.adminUsers', 'users', 'admin', 310),
    ('admin.ledger', '/admin/ledger', 'pages.account.navigation.adminLedger', 'receipt-text', 'admin', 350),
    ('admin.catalog-reviews', '/admin/catalog-reviews', 'pages.account.navigation.adminCatalogReviews', 'package-check', 'admin', 360),
    ('admin.risk-alerts', '/admin/risk-alerts', 'pages.account.navigation.adminRiskAlerts', 'shield-alert', 'admin', 370),
    ('admin.settings', '/admin/settings', 'pages.account.navigation.adminSettings', 'settings', 'admin', 410)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'admin'
FROM app_routes
WHERE route_key IN (
    'admin.users',
    'admin.ledger',
    'admin.catalog-reviews',
    'admin.risk-alerts',
    'admin.settings'
)
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.dashboard' THEN 300
        WHEN 'admin.users' THEN 310
        WHEN 'admin.merchants' THEN 320
        WHEN 'admin.usage-logs' THEN 330
        WHEN 'admin.withdrawals' THEN 340
        WHEN 'admin.ledger' THEN 350
        WHEN 'admin.catalog-reviews' THEN 360
        WHEN 'admin.risk-alerts' THEN 370
        WHEN 'admin.audit-logs' THEN 380
        WHEN 'admin.support' THEN 390
        WHEN 'admin.route-access' THEN 400
        WHEN 'admin.settings' THEN 410
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE group_key = 'admin';
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
    'admin.users',
    'admin.ledger',
    'admin.catalog-reviews',
    'admin.risk-alerts',
    'admin.settings'
);

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.dashboard' THEN 300
        WHEN 'admin.merchants' THEN 310
        WHEN 'admin.usage-logs' THEN 320
        WHEN 'admin.withdrawals' THEN 330
        WHEN 'admin.audit-logs' THEN 340
        WHEN 'admin.support' THEN 350
        WHEN 'admin.route-access' THEN 360
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE group_key = 'admin';
"#,
            )
            .await?;

        Ok(())
    }
}

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
    ('admin.dashboard', '/admin/dashboard', 'pages.account.navigation.adminDashboard', 'layout-dashboard', 'admin', 300),
    ('admin.merchants', '/admin/merchants', 'pages.account.navigation.adminMerchants', 'store', 'admin', 310),
    ('admin.merchant-requests', '/admin/merchant-requests', 'pages.account.navigation.adminMerchantRequests', 'clipboard-check', 'admin', 320),
    ('admin.usage-logs', '/admin/usage-logs', 'pages.account.navigation.adminUsageLogs', 'activity', 'admin', 330),
    ('admin.withdrawals', '/admin/withdrawals', 'pages.account.navigation.adminWithdrawals', 'wallet-cards', 'admin', 340),
    ('admin.audit-logs', '/admin/audit-logs', 'pages.account.navigation.adminAuditLogs', 'file-clock', 'admin', 350)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'admin'
FROM app_routes
WHERE route_key IN (
    'admin.dashboard',
    'admin.merchants',
    'admin.merchant-requests',
    'admin.usage-logs',
    'admin.withdrawals',
    'admin.audit-logs'
)
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.support' THEN 360
        WHEN 'admin.route-access' THEN 370
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE route_key IN ('admin.support', 'admin.route-access');
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
    'admin.dashboard',
    'admin.merchants',
    'admin.merchant-requests',
    'admin.usage-logs',
    'admin.withdrawals',
    'admin.audit-logs'
);

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.support' THEN 300
        WHEN 'admin.route-access' THEN 310
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE route_key IN ('admin.support', 'admin.route-access');
"#,
            )
            .await?;

        Ok(())
    }
}

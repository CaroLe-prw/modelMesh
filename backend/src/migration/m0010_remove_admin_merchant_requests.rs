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
DELETE FROM app_routes
WHERE route_key = 'admin.merchant-requests';

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.usage-logs' THEN 320
        WHEN 'admin.withdrawals' THEN 330
        WHEN 'admin.audit-logs' THEN 340
        WHEN 'admin.support' THEN 350
        WHEN 'admin.route-access' THEN 360
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE route_key IN (
    'admin.usage-logs',
    'admin.withdrawals',
    'admin.audit-logs',
    'admin.support',
    'admin.route-access'
);
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
INSERT INTO app_routes (route_key, path, label_key, icon_key, group_key, sort_order)
VALUES (
    'admin.merchant-requests',
    '/admin/merchant-requests',
    'pages.account.navigation.adminMerchantRequests',
    'clipboard-check',
    'admin',
    320
)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'admin'
FROM app_routes
WHERE route_key = 'admin.merchant-requests'
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.usage-logs' THEN 330
        WHEN 'admin.withdrawals' THEN 340
        WHEN 'admin.audit-logs' THEN 350
        WHEN 'admin.support' THEN 360
        WHEN 'admin.route-access' THEN 370
        ELSE sort_order
    END,
    updated_at = NOW()
WHERE route_key IN (
    'admin.usage-logs',
    'admin.withdrawals',
    'admin.audit-logs',
    'admin.support',
    'admin.route-access'
);
"#,
            )
            .await?;

        Ok(())
    }
}

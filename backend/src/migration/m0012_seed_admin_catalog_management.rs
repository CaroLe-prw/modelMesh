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
INSERT INTO app_routes (route_key, path, label_key, icon_key, group_key, sort_order)
VALUES (
    'admin.catalog-management',
    '/admin/catalog-management',
    'pages.account.navigation.adminCatalogManagement',
    'library-big',
    'admin',
    330
)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'admin'
FROM app_routes
WHERE route_key = 'admin.catalog-management'
ON CONFLICT (route_id, role) DO NOTHING;

UPDATE app_routes
SET sort_order = CASE route_key
        WHEN 'admin.dashboard' THEN 300
        WHEN 'admin.users' THEN 310
        WHEN 'admin.merchants' THEN 320
        WHEN 'admin.catalog-management' THEN 330
        WHEN 'admin.usage-logs' THEN 340
        WHEN 'admin.withdrawals' THEN 350
        WHEN 'admin.ledger' THEN 360
        WHEN 'admin.catalog-reviews' THEN 370
        WHEN 'admin.risk-alerts' THEN 380
        WHEN 'admin.audit-logs' THEN 390
        WHEN 'admin.support' THEN 400
        WHEN 'admin.route-access' THEN 410
        WHEN 'admin.settings' THEN 420
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
WHERE route_key = 'admin.catalog-management';

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
}

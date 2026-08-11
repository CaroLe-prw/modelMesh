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
    ('account.api-keys', '/account/api-keys', 'pages.account.navigation.apiKeys', 'key-round', 'personal', 100),
    ('account.usage', '/account/usage', 'pages.account.navigation.usage', 'usage', 'personal', 110),
    ('account.billing', '/account/billing', 'pages.account.navigation.billing', 'circle-dollar-sign', 'personal', 120),
    ('account.orders', '/account/orders', 'pages.account.navigation.orders', 'file-text', 'personal', 130),
    ('account.redeem', '/account/redeem', 'pages.account.navigation.redeem', 'gift', 'personal', 140),
    ('account.referrals', '/account/referrals', 'pages.account.navigation.referrals', 'users-round', 'personal', 150),
    ('account.profile', '/account/profile', 'pages.account.navigation.profile', 'user-round', 'personal', 160),
    ('account.support', '/account/support', 'pages.account.navigation.support', 'message-square-text', 'personal', 170),
    ('merchant.support', '/merchant/support', 'pages.account.navigation.merchantSupport', 'store', 'merchant', 200),
    ('admin.support', '/admin/support', 'pages.account.navigation.adminSupport', 'shield-check', 'admin', 300),
    ('admin.route-access', '/admin/route-access', 'pages.account.navigation.routeAccess', 'route', 'admin', 310)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, role
FROM app_routes
CROSS JOIN (VALUES ('personal'), ('merchant'), ('admin')) AS inherited_roles(role)
WHERE group_key = 'personal'
  AND route_key IN (
      'account.api-keys',
      'account.usage',
      'account.billing',
      'account.orders',
      'account.redeem',
      'account.referrals',
      'account.profile',
      'account.support'
  )
ON CONFLICT (route_id, role) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, role
FROM app_routes
CROSS JOIN (VALUES ('merchant'), ('admin')) AS inherited_roles(role)
WHERE group_key = 'merchant'
  AND route_key = 'merchant.support'
ON CONFLICT (route_id, role) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'admin'
FROM app_routes
WHERE group_key = 'admin'
  AND route_key IN ('admin.support', 'admin.route-access')
ON CONFLICT (route_id, role) DO NOTHING;
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
    'account.api-keys',
    'account.usage',
    'account.billing',
    'account.orders',
    'account.redeem',
    'account.referrals',
    'account.profile',
    'account.support',
    'merchant.support',
    'admin.support',
    'admin.route-access'
);
"#,
            )
            .await?;

        Ok(())
    }
}

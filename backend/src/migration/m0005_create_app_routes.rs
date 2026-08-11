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
CREATE TABLE app_routes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_key VARCHAR(64) NOT NULL UNIQUE,
    path VARCHAR(160) NOT NULL UNIQUE,
    label_key VARCHAR(160) NOT NULL,
    icon_key VARCHAR(48) NOT NULL,
    group_key VARCHAR(16) NOT NULL,
    sort_order INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT app_routes_path_absolute CHECK (path LIKE '/%'),
    CONSTRAINT app_routes_group_valid CHECK (group_key IN ('personal', 'merchant', 'admin'))
);

COMMENT ON TABLE app_routes IS '登录后账户中心可配置路由目录';
COMMENT ON COLUMN app_routes.id IS '数据库自动生成的路由唯一标识';
COMMENT ON COLUMN app_routes.route_key IS '前后端约定的稳定路由实现标识';
COMMENT ON COLUMN app_routes.path IS '浏览器访问使用的绝对路由路径';
COMMENT ON COLUMN app_routes.label_key IS '前端国际化导航文案键';
COMMENT ON COLUMN app_routes.icon_key IS '前端图标注册表标识';
COMMENT ON COLUMN app_routes.group_key IS '导航分组：个人、商户或管理';
COMMENT ON COLUMN app_routes.sort_order IS '路由在导航中的全局排序值';
COMMENT ON COLUMN app_routes.enabled IS '是否启用并允许出现在账户中心';
COMMENT ON COLUMN app_routes.created_at IS '路由配置创建时间';
COMMENT ON COLUMN app_routes.updated_at IS '路由配置最后更新时间';

CREATE TABLE app_route_roles (
    route_id BIGINT NOT NULL REFERENCES app_routes(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (route_id, role),
    CONSTRAINT app_route_roles_role_valid CHECK (role IN ('personal', 'merchant', 'admin'))
);

COMMENT ON TABLE app_route_roles IS '账户中心路由与可见账号角色的授权关系';
COMMENT ON COLUMN app_route_roles.route_id IS '被授权访问的路由标识';
COMMENT ON COLUMN app_route_roles.role IS '允许查看该路由的账号角色';
COMMENT ON COLUMN app_route_roles.created_at IS '路由角色授权创建时间';
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("app_route_roles"))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("app_routes")).to_owned())
            .await
    }
}

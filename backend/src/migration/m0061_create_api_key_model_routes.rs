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
CREATE TABLE api_key_model_routes (
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    merchant_model_listing_id UUID NOT NULL REFERENCES merchant_model_listings(id) ON DELETE CASCADE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (api_key_id, merchant_model_listing_id)
);

COMMENT ON TABLE api_key_model_routes IS '用户访问令牌选择的商家模型路由成员与固定商家配置';
COMMENT ON COLUMN api_key_model_routes.api_key_id IS '拥有该路由配置的用户访问令牌 UUID';
COMMENT ON COLUMN api_key_model_routes.model_id IS '路由成员对应的平台模型标识，用于约束每个模型只能固定一个商家';
COMMENT ON COLUMN api_key_model_routes.merchant_model_listing_id IS '加入路由的已发布商家模型 UUID';
COMMENT ON COLUMN api_key_model_routes.is_pinned IS '是否将该商家固定为对应模型的优先路由';
COMMENT ON COLUMN api_key_model_routes.created_at IS '商家模型首次加入令牌路由的时间';
COMMENT ON COLUMN api_key_model_routes.updated_at IS '路由成员或固定状态最后更新时间';

CREATE INDEX api_key_model_routes_listing_idx
    ON api_key_model_routes (merchant_model_listing_id, api_key_id);
CREATE UNIQUE INDEX api_key_model_routes_pinned_idx
    ON api_key_model_routes (api_key_id, model_id)
    WHERE is_pinned;
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE api_key_model_routes;")
            .await?;

        Ok(())
    }
}

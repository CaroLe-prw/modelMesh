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
CREATE TABLE merchant_channels (
    id UUID PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'offline',
    model_count BIGINT NOT NULL DEFAULT 0,
    success_rate_basis_points INTEGER NOT NULL DEFAULT 0,
    average_latency_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_channels_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT merchant_channels_provider_not_blank CHECK (BTRIM(provider) <> ''),
    CONSTRAINT merchant_channels_status_valid
        CHECK (status IN ('active', 'degraded', 'offline')),
    CONSTRAINT merchant_channels_model_count_non_negative CHECK (model_count >= 0),
    CONSTRAINT merchant_channels_success_rate_valid
        CHECK (success_rate_basis_points BETWEEN 0 AND 10000),
    CONSTRAINT merchant_channels_average_latency_non_negative CHECK (average_latency_ms >= 0)
);

COMMENT ON TABLE merchant_channels IS '商户接入并用于模型供应的渠道配置与运行摘要';
COMMENT ON COLUMN merchant_channels.id IS '服务端生成的渠道唯一标识';
COMMENT ON COLUMN merchant_channels.merchant_user_id IS '拥有该渠道的商户用户标识';
COMMENT ON COLUMN merchant_channels.name IS '商户自定义的渠道名称，同一商户内忽略大小写后唯一';
COMMENT ON COLUMN merchant_channels.provider IS '渠道连接的模型供应商或兼容服务名称';
COMMENT ON COLUMN merchant_channels.status IS '渠道运行状态：active、degraded 或 offline';
COMMENT ON COLUMN merchant_channels.model_count IS '当前关联到该渠道的模型数量';
COMMENT ON COLUMN merchant_channels.success_rate_basis_points IS '近期请求成功率，单位为基点，10000 表示 100%';
COMMENT ON COLUMN merchant_channels.average_latency_ms IS '近期请求平均响应延迟，单位为毫秒';
COMMENT ON COLUMN merchant_channels.created_at IS '渠道创建时间';
COMMENT ON COLUMN merchant_channels.updated_at IS '渠道配置或运行摘要最后更新时间';

CREATE UNIQUE INDEX merchant_channels_user_name_unique
    ON merchant_channels (merchant_user_id, LOWER(name));
CREATE INDEX merchant_channels_user_updated_at_idx
    ON merchant_channels (merchant_user_id, updated_at DESC, id DESC);
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("merchant_channels"))
                    .to_owned(),
            )
            .await
    }
}

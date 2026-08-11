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
CREATE TABLE models (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    brand_id BIGINT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    identifier VARCHAR(160) NOT NULL,
    name VARCHAR(200) NOT NULL,
    catalog_source VARCHAR(32),
    catalog_provider_id VARCHAR(64),
    catalog_model_id VARCHAR(160),
    context_window BIGINT NOT NULL,
    input_price_nano_usd_per_million BIGINT NOT NULL,
    input_price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    cache_read_price_nano_usd_per_million BIGINT NOT NULL,
    cache_read_price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    cache_write_price_nano_usd_per_million BIGINT NOT NULL,
    cache_write_price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    output_price_nano_usd_per_million BIGINT NOT NULL,
    output_price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(16) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT models_identifier_not_blank CHECK (BTRIM(identifier) <> ''),
    CONSTRAINT models_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT models_catalog_reference_complete CHECK (
        (catalog_source IS NULL AND catalog_provider_id IS NULL AND catalog_model_id IS NULL)
        OR
        (catalog_source IS NOT NULL AND catalog_provider_id IS NOT NULL AND catalog_model_id IS NOT NULL)
    ),
    CONSTRAINT models_context_window_positive CHECK (context_window > 0),
    CONSTRAINT models_input_price_non_negative CHECK (input_price_nano_usd_per_million >= 0),
    CONSTRAINT models_cache_read_price_non_negative CHECK (cache_read_price_nano_usd_per_million >= 0),
    CONSTRAINT models_cache_write_price_non_negative CHECK (cache_write_price_nano_usd_per_million >= 0),
    CONSTRAINT models_output_price_non_negative CHECK (output_price_nano_usd_per_million >= 0),
    CONSTRAINT models_status_valid CHECK (status IN ('published', 'disabled'))
);

COMMENT ON TABLE models IS '模型广场中由管理员维护并持久化的正式模型目录';
COMMENT ON COLUMN models.id IS '数据库自动生成的模型内部唯一标识';
COMMENT ON COLUMN models.brand_id IS '模型所属品牌的数据库内部标识';
COMMENT ON COLUMN models.identifier IS '对外使用并与上游官方标识保持一致的模型标识';
COMMENT ON COLUMN models.name IS '模型展示名称，目录模型使用上游官方名称';
COMMENT ON COLUMN models.catalog_source IS '模型默认元数据来源，例如 models.dev；自定义模型为空';
COMMENT ON COLUMN models.catalog_provider_id IS '模型在外部目录中的供应商标识；自定义模型为空';
COMMENT ON COLUMN models.catalog_model_id IS '模型在外部目录中的官方模型标识；自定义模型为空';
COMMENT ON COLUMN models.context_window IS '模型支持的最大上下文 Token 数';
COMMENT ON COLUMN models.input_price_nano_usd_per_million IS '每百万输入 Token 的当前生效美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN models.input_price_overridden IS '输入价格是否由管理员手动覆盖目录默认值';
COMMENT ON COLUMN models.cache_read_price_nano_usd_per_million IS '每百万缓存读取 Token 的当前生效美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN models.cache_read_price_overridden IS '缓存读取价格是否由管理员手动覆盖目录默认值';
COMMENT ON COLUMN models.cache_write_price_nano_usd_per_million IS '每百万缓存写入 Token 的当前生效美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN models.cache_write_price_overridden IS '缓存写入价格是否由管理员手动覆盖目录默认值';
COMMENT ON COLUMN models.output_price_nano_usd_per_million IS '每百万输出 Token 的当前生效美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN models.output_price_overridden IS '输出价格是否由管理员手动覆盖目录默认值';
COMMENT ON COLUMN models.status IS '模型状态：published 表示已上架，disabled 表示已下架';
COMMENT ON COLUMN models.created_at IS '模型创建时间';
COMMENT ON COLUMN models.updated_at IS '模型最后更新时间';

CREATE UNIQUE INDEX models_brand_identifier_unique
    ON models (brand_id, LOWER(identifier));

CREATE INDEX models_status_updated_at_idx
    ON models (status, updated_at DESC, id DESC);
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("models")).to_owned())
            .await
    }
}

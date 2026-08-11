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
ALTER TABLE brand_presets
    ADD COLUMN models_dev_provider_id VARCHAR(64);

COMMENT ON COLUMN brand_presets.models_dev_provider_id IS '该内置品牌在 models.dev 中对应的供应商标识，用于后端匹配模型目录';

ALTER TABLE brand_presets
    ADD CONSTRAINT brand_presets_models_dev_provider_id_normalized CHECK (
        models_dev_provider_id IS NULL
        OR (
            models_dev_provider_id = LOWER(BTRIM(models_dev_provider_id))
            AND models_dev_provider_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
    );

UPDATE brand_presets
SET models_dev_provider_id = CASE identifier
    WHEN 'openai' THEN 'openai'
    WHEN 'anthropic' THEN 'anthropic'
    WHEN 'deepseek' THEN 'deepseek'
    WHEN 'qwen' THEN 'alibaba'
    WHEN 'google' THEN 'google'
    WHEN 'xai' THEN 'xai'
    WHEN 'kimi' THEN 'moonshotai'
    WHEN 'moonshot' THEN 'moonshotai'
    WHEN 'zhipu' THEN 'zhipuai'
    WHEN 'minimax' THEN 'minimax'
    WHEN 'xiaomi' THEN 'xiaomi'
    ELSE NULL
END;

CREATE INDEX brand_presets_models_dev_provider_id_idx
    ON brand_presets (models_dev_provider_id)
    WHERE models_dev_provider_id IS NOT NULL;

CREATE TABLE model_catalog_entries (
    source VARCHAR(32) NOT NULL,
    provider_id VARCHAR(64) NOT NULL,
    model_id VARCHAR(160) NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    context_window BIGINT,
    input_price_nano_usd_per_million BIGINT,
    output_price_nano_usd_per_million BIGINT,
    source_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source, provider_id, model_id),
    CONSTRAINT model_catalog_entries_source_not_blank CHECK (BTRIM(source) <> ''),
    CONSTRAINT model_catalog_entries_provider_id_not_blank CHECK (BTRIM(provider_id) <> ''),
    CONSTRAINT model_catalog_entries_model_id_not_blank CHECK (BTRIM(model_id) <> ''),
    CONSTRAINT model_catalog_entries_model_name_not_blank CHECK (BTRIM(model_name) <> ''),
    CONSTRAINT model_catalog_entries_context_window_positive CHECK (
        context_window IS NULL OR context_window > 0
    ),
    CONSTRAINT model_catalog_entries_input_price_non_negative CHECK (
        input_price_nano_usd_per_million IS NULL
        OR input_price_nano_usd_per_million >= 0
    ),
    CONSTRAINT model_catalog_entries_output_price_non_negative CHECK (
        output_price_nano_usd_per_million IS NULL
        OR output_price_nano_usd_per_million >= 0
    )
);

COMMENT ON TABLE model_catalog_entries IS '由后端定时同步的第三方模型规格与价格目录缓存';
COMMENT ON COLUMN model_catalog_entries.source IS '目录数据来源，目前固定为 models.dev';
COMMENT ON COLUMN model_catalog_entries.provider_id IS '数据源中的供应商稳定标识';
COMMENT ON COLUMN model_catalog_entries.model_id IS '数据源中的模型稳定标识';
COMMENT ON COLUMN model_catalog_entries.model_name IS '数据源提供的模型展示名称';
COMMENT ON COLUMN model_catalog_entries.context_window IS '模型支持的最大上下文 Token 数，数据源未提供时为空';
COMMENT ON COLUMN model_catalog_entries.input_price_nano_usd_per_million IS '每百万输入 Token 的美元价格，按一亿分之一美元存储，数据源未提供时为空';
COMMENT ON COLUMN model_catalog_entries.output_price_nano_usd_per_million IS '每百万输出 Token 的美元价格，按一亿分之一美元存储，数据源未提供时为空';
COMMENT ON COLUMN model_catalog_entries.source_synced_at IS '本条目录数据最近一次从数据源同步的时间';

CREATE INDEX model_catalog_entries_lookup_idx
    ON model_catalog_entries (source, provider_id, LOWER(model_id));

CREATE TABLE model_catalog_sync_state (
    source VARCHAR(32) PRIMARY KEY,
    last_synced_at TIMESTAMPTZ NOT NULL,
    entry_count BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT model_catalog_sync_state_source_not_blank CHECK (BTRIM(source) <> ''),
    CONSTRAINT model_catalog_sync_state_entry_count_non_negative CHECK (entry_count >= 0)
);

COMMENT ON TABLE model_catalog_sync_state IS '模型目录各数据源最近一次成功同步的状态';
COMMENT ON COLUMN model_catalog_sync_state.source IS '模型目录数据来源稳定标识';
COMMENT ON COLUMN model_catalog_sync_state.last_synced_at IS '该数据源最近一次完整同步成功的时间';
COMMENT ON COLUMN model_catalog_sync_state.entry_count IS '最近一次同步后缓存的模型条目数量';
COMMENT ON COLUMN model_catalog_sync_state.updated_at IS '同步状态记录最后更新时间';
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
DROP TABLE model_catalog_sync_state;
DROP TABLE model_catalog_entries;
ALTER TABLE brand_presets DROP COLUMN models_dev_provider_id;
"#,
            )
            .await?;

        Ok(())
    }
}

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
ALTER TABLE model_catalog_entries
    ADD COLUMN pricing_nano_usd JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT model_catalog_entries_pricing_object CHECK (
        jsonb_typeof(pricing_nano_usd) = 'object'
    ),
    ADD CONSTRAINT model_catalog_entries_source_data_object CHECK (
        jsonb_typeof(source_data) = 'object'
    );

COMMENT ON COLUMN model_catalog_entries.pricing_nano_usd IS 'models.dev 的完整价格簿；所有美元价格按一亿分之一美元存储，并保留基础价、长上下文阶梯和实验模式';
COMMENT ON COLUMN model_catalog_entries.source_data IS 'models.dev 返回的该模型完整原始对象，用于保留当前及未来新增字段';

UPDATE model_catalog_entries
SET pricing_nano_usd = jsonb_build_object(
    'base',
    jsonb_strip_nulls(jsonb_build_object(
        'input', input_price_nano_usd_per_million,
        'cache_read', cache_read_price_nano_usd_per_million,
        'cache_write', cache_write_price_nano_usd_per_million,
        'output', output_price_nano_usd_per_million
    ))
);

ALTER TABLE models
    ADD COLUMN default_pricing_nano_usd JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN pricing_overrides_nano_usd JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT models_default_pricing_object CHECK (
        jsonb_typeof(default_pricing_nano_usd) = 'object'
    ),
    ADD CONSTRAINT models_pricing_overrides_object CHECK (
        jsonb_typeof(pricing_overrides_nano_usd) = 'object'
    );

COMMENT ON COLUMN models.default_pricing_nano_usd IS '从 models.dev 同步并会随定时任务更新的完整默认价格簿；自定义模型为空对象';
COMMENT ON COLUMN models.pricing_overrides_nano_usd IS '管理员手动填写的价格覆盖与额外服务档位；未填写的价格继续使用默认价格簿';

UPDATE models
SET default_pricing_nano_usd = jsonb_build_object(
        'base',
        jsonb_strip_nulls(jsonb_build_object(
            'input', CASE WHEN NOT input_price_overridden THEN input_price_nano_usd_per_million END,
            'cache_read', CASE WHEN NOT cache_read_price_overridden THEN cache_read_price_nano_usd_per_million END,
            'cache_write', CASE WHEN NOT cache_write_price_overridden THEN cache_write_price_nano_usd_per_million END,
            'output', CASE WHEN NOT output_price_overridden THEN output_price_nano_usd_per_million END
        ))
    ),
    pricing_overrides_nano_usd = jsonb_build_object(
        'base',
        jsonb_strip_nulls(jsonb_build_object(
            'input', CASE WHEN catalog_source IS NULL OR input_price_overridden THEN input_price_nano_usd_per_million END,
            'cache_read', CASE WHEN catalog_source IS NULL OR cache_read_price_overridden THEN cache_read_price_nano_usd_per_million END,
            'cache_write', CASE WHEN catalog_source IS NULL OR cache_write_price_overridden THEN cache_write_price_nano_usd_per_million END,
            'output', CASE WHEN catalog_source IS NULL OR output_price_overridden THEN output_price_nano_usd_per_million END
        ))
    );

UPDATE models AS managed
SET default_pricing_nano_usd = catalog.pricing_nano_usd
FROM model_catalog_entries AS catalog
WHERE managed.catalog_source = catalog.source
  AND managed.catalog_provider_id = catalog.provider_id
  AND managed.catalog_model_id = catalog.model_id;
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
ALTER TABLE models
    DROP CONSTRAINT models_pricing_overrides_object,
    DROP CONSTRAINT models_default_pricing_object,
    DROP COLUMN pricing_overrides_nano_usd,
    DROP COLUMN default_pricing_nano_usd;

ALTER TABLE model_catalog_entries
    DROP CONSTRAINT model_catalog_entries_source_data_object,
    DROP CONSTRAINT model_catalog_entries_pricing_object,
    DROP COLUMN source_data,
    DROP COLUMN pricing_nano_usd;
"#,
            )
            .await?;

        Ok(())
    }
}

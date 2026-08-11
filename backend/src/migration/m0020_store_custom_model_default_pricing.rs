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
UPDATE models
SET default_pricing_nano_usd = pricing_overrides_nano_usd,
    pricing_overrides_nano_usd = '{}'::jsonb,
    input_price_overridden = FALSE,
    cache_read_price_overridden = FALSE,
    cache_write_price_overridden = FALSE,
    output_price_overridden = FALSE
WHERE catalog_source IS NULL;

COMMENT ON COLUMN models.default_pricing_nano_usd IS '模型完整基准价格簿；models.dev 模型由定时同步更新，自定义模型由管理员维护，客户展示与计费直接读取本字段';
COMMENT ON COLUMN models.pricing_overrides_nano_usd IS '仅用于覆盖 models.dev 模型的默认价格；未填写的价格继续使用 default_pricing_nano_usd';
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
UPDATE models
SET pricing_overrides_nano_usd = default_pricing_nano_usd,
    default_pricing_nano_usd = '{}'::jsonb,
    input_price_overridden = TRUE,
    cache_read_price_overridden = TRUE,
    cache_write_price_overridden = TRUE,
    output_price_overridden = TRUE
WHERE catalog_source IS NULL;

COMMENT ON COLUMN models.default_pricing_nano_usd IS '从 models.dev 同步并会随定时任务更新的完整默认价格簿；自定义模型为空对象';
COMMENT ON COLUMN models.pricing_overrides_nano_usd IS '管理员手动填写的价格覆盖与额外服务档位；未填写的价格继续使用默认价格簿';
"#,
            )
            .await?;

        Ok(())
    }
}

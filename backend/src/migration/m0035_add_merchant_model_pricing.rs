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
ALTER TABLE merchant_model_listings
    ADD COLUMN pricing_nano_usd JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE merchant_model_listings
SET pricing_nano_usd = jsonb_build_object(
    'base',
    jsonb_build_object(
        'input', input_price_nano_usd_per_million,
        'output', output_price_nano_usd_per_million
    )
);

COMMENT ON COLUMN merchant_model_listings.pricing_nano_usd IS '商户完整销售价格规则，包含基础价、缓存、上下文阶梯、实验模式和服务档位，金额按一亿分之一美元存储';
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
ALTER TABLE merchant_model_listings
    DROP COLUMN pricing_nano_usd;
"#,
            )
            .await?;

        Ok(())
    }
}

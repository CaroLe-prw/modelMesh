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
INSERT INTO price_settings (price_currency, exchange_rate_nano_per_usd)
VALUES ('USD', 100000000)
ON CONFLICT (price_currency) DO NOTHING;

COMMENT ON TABLE price_settings IS '平台允许商户录入销售价格时使用的币种与固定汇率集合，其中 USD 为不可删除的默认币种';
COMMENT ON COLUMN price_settings.price_currency IS '价格配置币种，同一币种仅允许一条配置，USD 为系统默认币种';
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
COMMENT ON TABLE price_settings IS '平台允许商户录入销售价格时使用的币种与固定汇率集合';
COMMENT ON COLUMN price_settings.price_currency IS '价格配置币种，同一币种仅允许一条配置';
"#,
            )
            .await?;

        Ok(())
    }
}

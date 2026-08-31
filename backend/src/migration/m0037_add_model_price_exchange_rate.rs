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
ALTER TABLE models
    ADD COLUMN price_currency VARCHAR(4) NOT NULL DEFAULT 'USD',
    ADD COLUMN exchange_rate_nano_per_usd BIGINT NOT NULL DEFAULT 100000000,
    ADD CONSTRAINT models_price_currency_valid CHECK (
        price_currency IN (
            'USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD',
            'SGD', 'AUD', 'CAD', 'KRW', 'USDT'
        )
    ),
    ADD CONSTRAINT models_exchange_rate_positive CHECK (exchange_rate_nano_per_usd > 0),
    ADD CONSTRAINT models_usd_exchange_rate_fixed CHECK (
        price_currency <> 'USD' OR exchange_rate_nano_per_usd = 100000000
    );

COMMENT ON COLUMN models.price_currency IS '管理员维护模型价格时使用的价格单位；客户展示与计费仍统一换算为 USD';
COMMENT ON COLUMN models.exchange_rate_nano_per_usd IS '管理员配置的固定汇率，表示 1 USD 对应多少价格单位，按一亿分之一单位存储';
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
    DROP CONSTRAINT models_usd_exchange_rate_fixed,
    DROP CONSTRAINT models_exchange_rate_positive,
    DROP CONSTRAINT models_price_currency_valid,
    DROP COLUMN exchange_rate_nano_per_usd,
    DROP COLUMN price_currency;
"#,
            )
            .await?;

        Ok(())
    }
}

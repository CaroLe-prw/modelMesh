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
    DROP CONSTRAINT models_usd_exchange_rate_fixed,
    DROP CONSTRAINT models_exchange_rate_positive,
    DROP CONSTRAINT models_price_currency_valid,
    DROP COLUMN exchange_rate_nano_per_usd,
    DROP COLUMN price_currency;

CREATE TABLE price_settings (
    id SMALLINT PRIMARY KEY,
    price_currency VARCHAR(4) NOT NULL DEFAULT 'USD',
    exchange_rate_nano_per_usd BIGINT NOT NULL DEFAULT 100000000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT price_settings_singleton CHECK (id = 1),
    CONSTRAINT price_settings_currency_valid CHECK (
        price_currency IN (
            'USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD',
            'SGD', 'AUD', 'CAD', 'KRW', 'USDT'
        )
    ),
    CONSTRAINT price_settings_exchange_rate_positive CHECK (
        exchange_rate_nano_per_usd > 0
    ),
    CONSTRAINT price_settings_usd_exchange_rate_fixed CHECK (
        price_currency <> 'USD' OR exchange_rate_nano_per_usd = 100000000
    )
);

COMMENT ON TABLE price_settings IS '平台全局价格币种与固定汇率配置，仅保存一条记录';
COMMENT ON COLUMN price_settings.id IS '单例配置标识，固定为 1';
COMMENT ON COLUMN price_settings.price_currency IS '商户维护销售价格时使用的价格单位，客户侧仍统一展示 USD';
COMMENT ON COLUMN price_settings.exchange_rate_nano_per_usd IS '固定汇率，表示 1 USD 对应多少价格单位，按一亿分之一单位存储';
COMMENT ON COLUMN price_settings.updated_at IS '配置最后更新时间';

INSERT INTO price_settings (id, price_currency, exchange_rate_nano_per_usd)
VALUES (1, 'USD', 100000000);
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
DROP TABLE price_settings;

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
}

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
ALTER TABLE price_settings
    DROP CONSTRAINT price_settings_singleton,
    DROP CONSTRAINT price_settings_pkey,
    DROP COLUMN id,
    ADD CONSTRAINT price_settings_pkey PRIMARY KEY (price_currency);

COMMENT ON TABLE price_settings IS '平台允许商户录入销售价格时使用的币种与固定汇率集合';
COMMENT ON COLUMN price_settings.price_currency IS '价格配置币种，同一币种仅允许一条配置';
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
INSERT INTO price_settings (price_currency, exchange_rate_nano_per_usd)
SELECT 'USD', 100000000
WHERE NOT EXISTS (SELECT 1 FROM price_settings);

DELETE FROM price_settings
WHERE price_currency <> (
    SELECT price_currency
    FROM price_settings
    ORDER BY CASE WHEN price_currency = 'USD' THEN 0 ELSE 1 END, price_currency
    LIMIT 1
);

ALTER TABLE price_settings
    DROP CONSTRAINT price_settings_pkey,
    ADD COLUMN id SMALLINT;

UPDATE price_settings SET id = 1;

ALTER TABLE price_settings
    ALTER COLUMN id SET NOT NULL,
    ADD CONSTRAINT price_settings_pkey PRIMARY KEY (id),
    ADD CONSTRAINT price_settings_singleton CHECK (id = 1);

COMMENT ON TABLE price_settings IS '平台全局价格币种与固定汇率配置，仅保存一条记录';
COMMENT ON COLUMN price_settings.id IS '单例配置标识，固定为 1';
COMMENT ON COLUMN price_settings.price_currency IS '商户维护销售价格时使用的价格单位，客户侧仍统一展示 USD';
"#,
            )
            .await?;

        Ok(())
    }
}

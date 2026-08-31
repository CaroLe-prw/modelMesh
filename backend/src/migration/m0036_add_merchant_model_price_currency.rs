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
    RENAME COLUMN input_price_nano_usd_per_million TO input_price_nano_per_million;

ALTER TABLE merchant_model_listings
    RENAME COLUMN output_price_nano_usd_per_million TO output_price_nano_per_million;

ALTER TABLE merchant_model_listings
    RENAME COLUMN pricing_nano_usd TO pricing_nano;

ALTER TABLE merchant_model_listings
    ADD COLUMN price_currency VARCHAR(4) NOT NULL DEFAULT 'USD',
    ADD CONSTRAINT merchant_model_listings_price_currency_valid
        CHECK (price_currency IN (
            'USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD',
            'SGD', 'AUD', 'CAD', 'KRW', 'USDT'
        ));

COMMENT ON COLUMN merchant_model_listings.price_currency IS '商户模型销售价格币种：USD、CNY、EUR、GBP、JPY、HKD、SGD、AUD、CAD、KRW 或 USDT';
COMMENT ON COLUMN merchant_model_listings.input_price_nano_per_million IS '商户每百万输入 Token 的销售价格，按所选币种的一亿分之一单位存储';
COMMENT ON COLUMN merchant_model_listings.output_price_nano_per_million IS '商户每百万输出 Token 的销售价格，按所选币种的一亿分之一单位存储';
COMMENT ON COLUMN merchant_model_listings.pricing_nano IS '商户完整销售价格规则，金额按所选币种的一亿分之一单位存储';
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
    DROP CONSTRAINT merchant_model_listings_price_currency_valid,
    DROP COLUMN price_currency;

ALTER TABLE merchant_model_listings
    RENAME COLUMN input_price_nano_per_million TO input_price_nano_usd_per_million;

ALTER TABLE merchant_model_listings
    RENAME COLUMN output_price_nano_per_million TO output_price_nano_usd_per_million;

ALTER TABLE merchant_model_listings
    RENAME COLUMN pricing_nano TO pricing_nano_usd;

COMMENT ON COLUMN merchant_model_listings.input_price_nano_usd_per_million IS '商户每百万输入 Token 的销售美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN merchant_model_listings.output_price_nano_usd_per_million IS '商户每百万输出 Token 的销售美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN merchant_model_listings.pricing_nano_usd IS '商户完整销售价格规则，包含基础价、缓存、上下文阶梯、实验模式和服务档位，金额按一亿分之一美元存储';
"#,
            )
            .await?;

        Ok(())
    }
}

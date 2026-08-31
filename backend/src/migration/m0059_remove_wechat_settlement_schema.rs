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
ALTER TABLE merchant_settlement_accounts
    DROP CONSTRAINT merchant_settlement_accounts_method_valid,
    DROP CONSTRAINT merchant_settlement_accounts_method_currency_network_valid,
    ADD CONSTRAINT merchant_settlement_accounts_method_valid
        CHECK (method IN ('bank', 'alipay', 'usdt')),
    ADD CONSTRAINT merchant_settlement_accounts_method_currency_network_valid CHECK (
        (method = 'bank' AND currency IN ('CNY', 'USD') AND network IS NULL)
        OR (method = 'alipay' AND currency = 'CNY' AND network IS NULL)
        OR (method = 'usdt' AND currency = 'USDT')
    );

COMMENT ON TABLE merchant_settlement_accounts IS
    '商户提款使用的加密银行卡、支付宝与 USDT 钱包配置';
COMMENT ON COLUMN merchant_settlement_accounts.method IS
    '结算方式：bank 银行卡、alipay 支付宝或 usdt 钱包';
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
ALTER TABLE merchant_settlement_accounts
    DROP CONSTRAINT merchant_settlement_accounts_method_valid,
    DROP CONSTRAINT merchant_settlement_accounts_method_currency_network_valid,
    ADD CONSTRAINT merchant_settlement_accounts_method_valid
        CHECK (method IN ('bank', 'wechat', 'alipay', 'usdt')),
    ADD CONSTRAINT merchant_settlement_accounts_method_currency_network_valid CHECK (
        (method = 'bank' AND currency IN ('CNY', 'USD') AND network IS NULL)
        OR (method IN ('wechat', 'alipay') AND currency = 'CNY' AND network IS NULL)
        OR (method = 'usdt' AND currency = 'USDT')
    );

COMMENT ON TABLE merchant_settlement_accounts IS
    '商户提款使用的加密银行卡、微信、支付宝与 USDT 钱包配置';
COMMENT ON COLUMN merchant_settlement_accounts.method IS
    '结算方式：bank 银行卡、wechat 微信、alipay 支付宝或 usdt 钱包';
"#,
            )
            .await?;

        Ok(())
    }
}

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
    ADD COLUMN network VARCHAR(16);

ALTER TABLE merchant_settlement_accounts
    DROP CONSTRAINT merchant_settlement_accounts_method_valid,
    DROP CONSTRAINT merchant_settlement_accounts_currency_valid,
    DROP CONSTRAINT merchant_settlement_accounts_method_currency_valid;

ALTER TABLE merchant_settlement_accounts
    ADD CONSTRAINT merchant_settlement_accounts_method_valid
        CHECK (method IN ('bank', 'alipay', 'usdt')),
    ADD CONSTRAINT merchant_settlement_accounts_currency_valid
        CHECK (currency IN ('CNY', 'USD', 'USDT')),
    ADD CONSTRAINT merchant_settlement_accounts_network_valid
        CHECK (network IS NULL OR network IN ('TRC20', 'ERC20', 'BEP20', 'POLYGON')),
    ADD CONSTRAINT merchant_settlement_accounts_method_currency_network_valid CHECK (
        (method = 'bank' AND currency IN ('CNY', 'USD') AND network IS NULL)
        OR (method = 'alipay' AND currency = 'CNY' AND network IS NULL)
        OR (method = 'usdt' AND currency = 'USDT')
    );

COMMENT ON TABLE merchant_settlement_accounts IS
    '商户提款使用的加密银行卡、支付宝与 USDT 钱包配置';
COMMENT ON COLUMN merchant_settlement_accounts.method IS
    '结算方式：bank 银行卡、alipay 支付宝或 usdt 钱包';
COMMENT ON COLUMN merchant_settlement_accounts.currency IS
    '结算币种：CNY、USD 或 USDT，由结算方式约束';
COMMENT ON COLUMN merchant_settlement_accounts.network IS
    'USDT 到账网络：TRC20、ERC20、BEP20 或 POLYGON；非 USDT 为空';
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
DELETE FROM merchant_settlement_accounts
WHERE method = 'alipay'
   OR currency = 'CNY';

ALTER TABLE merchant_settlement_accounts
    DROP CONSTRAINT merchant_settlement_accounts_method_valid,
    DROP CONSTRAINT merchant_settlement_accounts_currency_valid,
    DROP CONSTRAINT merchant_settlement_accounts_network_valid,
    DROP CONSTRAINT merchant_settlement_accounts_method_currency_network_valid,
    DROP COLUMN network;

ALTER TABLE merchant_settlement_accounts
    ADD CONSTRAINT merchant_settlement_accounts_method_valid CHECK (method IN ('bank', 'usdt')),
    ADD CONSTRAINT merchant_settlement_accounts_currency_valid CHECK (currency IN ('USD', 'USDT')),
    ADD CONSTRAINT merchant_settlement_accounts_method_currency_valid CHECK (
        (method = 'bank' AND currency = 'USD')
        OR (method = 'usdt' AND currency = 'USDT')
    );

COMMENT ON TABLE merchant_settlement_accounts IS
    '商户提款使用的加密银行账户与 USDT 钱包配置';
COMMENT ON COLUMN merchant_settlement_accounts.method IS
    '结算方式：bank 银行账户或 usdt 钱包';
COMMENT ON COLUMN merchant_settlement_accounts.currency IS
    '结算币种：USD 或 USDT';
"#,
            )
            .await?;

        Ok(())
    }
}

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
DELETE FROM merchant_settlement_method_settings
WHERE method = 'wechat';

ALTER TABLE merchant_settlement_method_settings
    DROP CONSTRAINT merchant_settlement_method_settings_method_valid,
    ADD CONSTRAINT merchant_settlement_method_settings_method_valid
        CHECK (method IN ('bank', 'alipay', 'usdt'));

COMMENT ON COLUMN merchant_settlement_method_settings.method IS
    '结算方式稳定编码：bank、alipay 或 usdt';
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
ALTER TABLE merchant_settlement_method_settings
    DROP CONSTRAINT merchant_settlement_method_settings_method_valid,
    ADD CONSTRAINT merchant_settlement_method_settings_method_valid
        CHECK (method IN ('bank', 'wechat', 'alipay', 'usdt'));

INSERT INTO merchant_settlement_method_settings (method, is_enabled, sort_order)
VALUES ('wechat', TRUE, 20);

COMMENT ON COLUMN merchant_settlement_method_settings.method IS
    '结算方式稳定编码：bank、wechat、alipay 或 usdt';
"#,
            )
            .await?;

        Ok(())
    }
}

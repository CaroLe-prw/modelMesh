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
    ADD COLUMN billing_mode VARCHAR(16) NOT NULL DEFAULT 'token',
    ADD COLUMN pending_billing_mode VARCHAR(16),
    ADD CONSTRAINT merchant_model_listings_billing_mode_valid
        CHECK (billing_mode IN ('token', 'request')),
    ADD CONSTRAINT merchant_model_listings_pending_billing_mode_valid
        CHECK (pending_billing_mode IS NULL OR pending_billing_mode IN ('token', 'request'));

UPDATE merchant_model_listings
SET pending_billing_mode = 'token'
WHERE pending_pricing_nano IS NOT NULL;

COMMENT ON COLUMN merchant_model_listings.billing_mode IS '商户当前生效的计费方式：token 按 Token，request 按调用次数';
COMMENT ON COLUMN merchant_model_listings.pending_billing_mode IS '等待审核或延迟生效的新计费方式，与待生效价格规则保持一致';

CREATE INDEX merchant_model_listings_model_billing_mode_idx
    ON merchant_model_listings (model_id, billing_mode, status);
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
DROP INDEX merchant_model_listings_model_billing_mode_idx;
ALTER TABLE merchant_model_listings
    DROP CONSTRAINT merchant_model_listings_pending_billing_mode_valid,
    DROP CONSTRAINT merchant_model_listings_billing_mode_valid,
    DROP COLUMN pending_billing_mode,
    DROP COLUMN billing_mode;
"#,
            )
            .await?;

        Ok(())
    }
}

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
ALTER TABLE users
    ADD COLUMN merchant_status VARCHAR(16) NOT NULL DEFAULT 'active',
    ADD CONSTRAINT users_merchant_status_valid
        CHECK (merchant_status IN ('active', 'disabled'));

UPDATE users
SET merchant_status = 'disabled',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'merchant'
  AND status = 'disabled';

COMMENT ON COLUMN users.merchant_status IS '商户功能状态：active 表示可使用商户能力，disabled 表示仅停用商户能力且不影响账号登录';
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
UPDATE users
SET status = 'disabled',
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'merchant'
  AND merchant_status = 'disabled';

ALTER TABLE users
    DROP CONSTRAINT users_merchant_status_valid,
    DROP COLUMN merchant_status;
"#,
            )
            .await?;

        Ok(())
    }
}

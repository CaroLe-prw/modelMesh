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
    ADD COLUMN billing_mode VARCHAR(16) NOT NULL DEFAULT 'token',
    ADD CONSTRAINT models_billing_mode_valid CHECK (billing_mode IN ('token', 'image'));

COMMENT ON COLUMN models.billing_mode IS '模型计费方式：token 按 Token 计费，image 按图片生成次数与分辨率计费';

CREATE INDEX models_billing_mode_idx ON models (billing_mode);
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
DROP INDEX models_billing_mode_idx;
ALTER TABLE models
    DROP CONSTRAINT models_billing_mode_valid,
    DROP COLUMN billing_mode;
"#,
            )
            .await?;

        Ok(())
    }
}

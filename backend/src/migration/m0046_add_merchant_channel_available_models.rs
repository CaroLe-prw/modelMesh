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
ALTER TABLE merchant_channels
    ADD COLUMN available_models JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE merchant_channels
SET available_models = supported_models;

ALTER TABLE merchant_channels
    ADD CONSTRAINT merchant_channels_available_models_valid
        CHECK (
            jsonb_typeof(available_models) = 'array'
            AND jsonb_array_length(available_models) <= 2000
        );

COMMENT ON COLUMN merchant_channels.available_models
    IS '渠道最近一次获取或手动补充的完整可选模型标识列表；包含但不限于当前启用模型';
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
ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_available_models_valid,
    DROP COLUMN IF EXISTS available_models;
"#,
            )
            .await?;

        Ok(())
    }
}

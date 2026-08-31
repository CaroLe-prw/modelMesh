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
    ADD COLUMN public_id BIGINT GENERATED ALWAYS AS IDENTITY,
    ADD CONSTRAINT merchant_channels_public_id_unique UNIQUE (public_id),
    ADD CONSTRAINT merchant_channels_public_id_positive CHECK (public_id > 0);

COMMENT ON COLUMN merchant_channels.public_id
    IS '面向商户和管理员展示、搜索的自增渠道编号；内部关联继续使用 UUID 主键';
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
    DROP CONSTRAINT IF EXISTS merchant_channels_public_id_positive,
    DROP CONSTRAINT IF EXISTS merchant_channels_public_id_unique,
    DROP COLUMN IF EXISTS public_id;
"#,
            )
            .await?;

        Ok(())
    }
}

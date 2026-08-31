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
UPDATE merchant_channels
SET status = 'offline', updated_at = NOW()
WHERE review_status <> 'approved' AND status <> 'offline';

ALTER TABLE merchant_channels
    ADD CONSTRAINT merchant_channels_review_required_before_activation
    CHECK (review_status = 'approved' OR status = 'offline');
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
    DROP CONSTRAINT IF EXISTS merchant_channels_review_required_before_activation;
"#,
            )
            .await?;

        Ok(())
    }
}

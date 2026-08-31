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
    ADD COLUMN review_note TEXT NOT NULL DEFAULT '',
    ADD CONSTRAINT merchant_channels_review_note_valid
        CHECK (CHAR_LENGTH(review_note) <= 1000);

ALTER TABLE merchant_model_listings
    ADD COLUMN review_note TEXT NOT NULL DEFAULT '',
    ADD CONSTRAINT merchant_model_listings_review_note_valid
        CHECK (CHAR_LENGTH(review_note) <= 1000);

COMMENT ON COLUMN merchant_channels.review_note
    IS '管理员最近一次渠道审核意见；拒绝时必填，重新提交审核时清空';
COMMENT ON COLUMN merchant_model_listings.review_note
    IS '管理员最近一次模型审核意见；拒绝时必填，重新提交审核时清空';
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
    DROP CONSTRAINT IF EXISTS merchant_model_listings_review_note_valid,
    DROP COLUMN IF EXISTS review_note;
ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_review_note_valid,
    DROP COLUMN IF EXISTS review_note;
"#,
            )
            .await?;

        Ok(())
    }
}

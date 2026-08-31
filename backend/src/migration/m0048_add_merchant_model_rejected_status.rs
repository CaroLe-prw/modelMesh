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
    DROP CONSTRAINT IF EXISTS merchant_model_listings_status_valid,
    ADD CONSTRAINT merchant_model_listings_status_valid
        CHECK (status IN ('draft', 'review', 'rejected', 'published'));

UPDATE merchant_model_listings
SET status = 'rejected'
WHERE status = 'draft' AND review_note <> '';

COMMENT ON COLUMN merchant_model_listings.status
    IS '模型上架状态：draft 草稿、review 审核中、rejected 已拒绝、published 已上架';
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
UPDATE merchant_model_listings SET status = 'draft' WHERE status = 'rejected';

ALTER TABLE merchant_model_listings
    DROP CONSTRAINT IF EXISTS merchant_model_listings_status_valid,
    ADD CONSTRAINT merchant_model_listings_status_valid
        CHECK (status IN ('draft', 'review', 'published'));

COMMENT ON COLUMN merchant_model_listings.status
    IS '上架状态：draft、review 或 published';
"#,
            )
            .await?;

        Ok(())
    }
}

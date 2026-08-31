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
    ADD COLUMN review_status VARCHAR(16) NOT NULL DEFAULT 'approved',
    ADD COLUMN review_action VARCHAR(24) NOT NULL DEFAULT 'publish',
    ADD COLUMN review_submitted_at TIMESTAMPTZ,
    ADD CONSTRAINT merchant_channels_review_status_valid
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    ADD CONSTRAINT merchant_channels_review_action_valid
        CHECK (review_action IN ('publish', 'price_change', 'unpublish', 'violation'));

UPDATE merchant_channels SET review_submitted_at = updated_at;
ALTER TABLE merchant_channels
    ALTER COLUMN review_submitted_at SET NOT NULL,
    ALTER COLUMN review_submitted_at SET DEFAULT NOW();

ALTER TABLE merchant_model_listings
    ADD COLUMN review_action VARCHAR(24) NOT NULL DEFAULT 'publish',
    ADD COLUMN review_submitted_at TIMESTAMPTZ,
    ADD CONSTRAINT merchant_model_listings_review_action_valid
        CHECK (review_action IN ('publish', 'price_change', 'unpublish', 'violation'));

UPDATE merchant_model_listings SET review_submitted_at = updated_at;
ALTER TABLE merchant_model_listings
    ALTER COLUMN review_submitted_at SET NOT NULL,
    ALTER COLUMN review_submitted_at SET DEFAULT NOW();

COMMENT ON COLUMN merchant_channels.review_status
    IS '渠道资料审核状态：pending、approved 或 rejected；与运行状态相互独立';
COMMENT ON COLUMN merchant_channels.review_action
    IS '渠道本次待审或最近审核动作：publish、price_change、unpublish 或 violation';
COMMENT ON COLUMN merchant_channels.review_submitted_at
    IS '渠道本次审核提交时间，不随管理员处理时间改变';
COMMENT ON COLUMN merchant_model_listings.review_action
    IS '模型本次待审或最近审核动作：publish、price_change、unpublish 或 violation';
COMMENT ON COLUMN merchant_model_listings.review_submitted_at
    IS '模型本次审核提交时间，不随管理员处理时间改变';

CREATE INDEX merchant_channels_review_status_submitted_at_idx
    ON merchant_channels (review_status, review_submitted_at DESC, id DESC);
CREATE INDEX merchant_model_listings_review_status_submitted_at_idx
    ON merchant_model_listings (status, review_submitted_at DESC, id DESC);
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
DROP INDEX IF EXISTS merchant_channels_review_status_submitted_at_idx;
DROP INDEX IF EXISTS merchant_model_listings_review_status_submitted_at_idx;
ALTER TABLE merchant_model_listings
    DROP CONSTRAINT IF EXISTS merchant_model_listings_review_action_valid,
    DROP COLUMN IF EXISTS review_submitted_at,
    DROP COLUMN IF EXISTS review_action;
ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_review_status_valid,
    DROP CONSTRAINT IF EXISTS merchant_channels_review_action_valid,
    DROP COLUMN IF EXISTS review_submitted_at,
    DROP COLUMN IF EXISTS review_action,
    DROP COLUMN IF EXISTS review_status;
"#,
            )
            .await?;

        Ok(())
    }
}

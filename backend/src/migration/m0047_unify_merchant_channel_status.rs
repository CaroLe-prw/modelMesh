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
DROP INDEX IF EXISTS merchant_channels_review_status_submitted_at_idx;

ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_review_required_before_activation,
    DROP CONSTRAINT IF EXISTS merchant_channels_status_valid;

UPDATE merchant_channels
SET status = CASE
    WHEN review_status = 'pending' THEN 'pending'
    WHEN review_status = 'rejected' THEN 'rejected'
    WHEN status = 'active' THEN 'active'
    ELSE 'offline'
END;

ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_review_status_valid,
    DROP COLUMN review_status,
    ADD CONSTRAINT merchant_channels_status_valid
        CHECK (status IN ('pending', 'rejected', 'offline', 'active'));

COMMENT ON COLUMN merchant_channels.status
    IS '渠道统一状态：pending 审核中、rejected 已拒绝、offline 已下线、active 已激活';

CREATE INDEX merchant_channels_status_submitted_at_idx
    ON merchant_channels (status, review_submitted_at DESC, id DESC);
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
DROP INDEX IF EXISTS merchant_channels_status_submitted_at_idx;

ALTER TABLE merchant_channels
    DROP CONSTRAINT IF EXISTS merchant_channels_status_valid,
    ADD COLUMN review_status VARCHAR(16) NOT NULL DEFAULT 'approved';

UPDATE merchant_channels
SET review_status = CASE
        WHEN status = 'pending' THEN 'pending'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE 'approved'
    END,
    status = CASE
        WHEN status IN ('pending', 'rejected') THEN 'offline'
        ELSE status
    END;

ALTER TABLE merchant_channels
    ADD CONSTRAINT merchant_channels_status_valid
        CHECK (status IN ('active', 'degraded', 'offline')),
    ADD CONSTRAINT merchant_channels_review_status_valid
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    ADD CONSTRAINT merchant_channels_review_required_before_activation
        CHECK (review_status = 'approved' OR status = 'offline');

COMMENT ON COLUMN merchant_channels.status
    IS '渠道运行状态：active、degraded 或 offline';
COMMENT ON COLUMN merchant_channels.review_status
    IS '渠道资料审核状态：pending、approved 或 rejected；与运行状态相互独立';

CREATE INDEX merchant_channels_review_status_submitted_at_idx
    ON merchant_channels (review_status, review_submitted_at DESC, id DESC);
"#,
            )
            .await?;

        Ok(())
    }
}

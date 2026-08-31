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
CREATE TABLE model_price_review_settings (
    id SMALLINT PRIMARY KEY,
    price_increase_review_threshold_bps BIGINT NOT NULL DEFAULT 0,
    approved_price_effective_delay_hours INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT model_price_review_settings_singleton CHECK (id = 1),
    CONSTRAINT model_price_review_settings_threshold_valid
        CHECK (price_increase_review_threshold_bps BETWEEN 0 AND 100000),
    CONSTRAINT model_price_review_settings_delay_valid
        CHECK (approved_price_effective_delay_hours BETWEEN 0 AND 720)
);

COMMENT ON TABLE model_price_review_settings IS '平台模型涨价复审与审批后延迟生效策略，仅保存一条记录';
COMMENT ON COLUMN model_price_review_settings.id IS '单例配置标识，固定为 1';
COMMENT ON COLUMN model_price_review_settings.price_increase_review_threshold_bps IS '触发重新审核的最大允许涨幅，按基点存储，100 基点等于 1%';
COMMENT ON COLUMN model_price_review_settings.approved_price_effective_delay_hours IS '涨价审核通过后，新价格延迟生效的小时数';
COMMENT ON COLUMN model_price_review_settings.updated_at IS '模型价格审核策略最后更新时间';

INSERT INTO model_price_review_settings (
    id,
    price_increase_review_threshold_bps,
    approved_price_effective_delay_hours
) VALUES (1, 0, 0);

ALTER TABLE merchant_model_listings
    ADD COLUMN review_status VARCHAR(16) NOT NULL DEFAULT 'approved',
    ADD COLUMN has_approved_price BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN pending_price_currency VARCHAR(8),
    ADD COLUMN pending_input_price_nano_per_million BIGINT,
    ADD COLUMN pending_output_price_nano_per_million BIGINT,
    ADD COLUMN pending_pricing_nano JSONB,
    ADD COLUMN price_effective_at TIMESTAMPTZ,
    ADD CONSTRAINT merchant_model_listings_review_status_valid
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    ADD CONSTRAINT merchant_model_listings_pending_price_currency_valid
        CHECK (
            pending_price_currency IS NULL OR
            pending_price_currency IN ('USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD', 'SGD', 'AUD', 'CAD', 'KRW', 'USDT')
        ),
    ADD CONSTRAINT merchant_model_listings_pending_input_price_non_negative
        CHECK (pending_input_price_nano_per_million IS NULL OR pending_input_price_nano_per_million >= 0),
    ADD CONSTRAINT merchant_model_listings_pending_output_price_non_negative
        CHECK (pending_output_price_nano_per_million IS NULL OR pending_output_price_nano_per_million >= 0),
    ADD CONSTRAINT merchant_model_listings_pending_price_complete
        CHECK (
            (pending_price_currency IS NULL AND
             pending_input_price_nano_per_million IS NULL AND
             pending_output_price_nano_per_million IS NULL AND
             pending_pricing_nano IS NULL) OR
            (pending_price_currency IS NOT NULL AND
             pending_input_price_nano_per_million IS NOT NULL AND
             pending_output_price_nano_per_million IS NOT NULL AND
             pending_pricing_nano IS NOT NULL)
        );

UPDATE merchant_model_listings
SET review_status = CASE status
        WHEN 'review' THEN 'pending'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'draft' THEN 'rejected'
        ELSE 'approved'
    END,
    has_approved_price = status IN ('offline', 'published'),
    status = CASE WHEN status = 'published' THEN 'published' ELSE 'offline' END;

ALTER TABLE merchant_model_listings
    ALTER COLUMN status SET DEFAULT 'offline',
    DROP CONSTRAINT IF EXISTS merchant_model_listings_status_valid,
    ADD CONSTRAINT merchant_model_listings_status_valid
        CHECK (status IN ('offline', 'published')),
    ADD CONSTRAINT merchant_model_listings_published_has_approved_price
        CHECK (status <> 'published' OR has_approved_price),
    ADD CONSTRAINT merchant_model_listings_price_effective_state_valid
        CHECK (
            price_effective_at IS NULL OR
            (pending_pricing_nano IS NOT NULL AND review_status = 'approved' AND has_approved_price)
        );

DROP INDEX IF EXISTS merchant_model_listings_review_status_submitted_at_idx;
CREATE INDEX merchant_model_listings_review_status_submitted_at_idx
    ON merchant_model_listings (review_status, review_submitted_at DESC, id DESC);
CREATE INDEX merchant_model_listings_price_effective_at_idx
    ON merchant_model_listings (price_effective_at)
    WHERE price_effective_at IS NOT NULL;

COMMENT ON COLUMN merchant_model_listings.status IS '模型运行状态：offline 已下架或 published 已上架；与审核状态相互独立';
COMMENT ON COLUMN merchant_model_listings.review_status IS '模型本次提交的审核状态：pending 待审核、approved 已通过或 rejected 已拒绝';
COMMENT ON COLUMN merchant_model_listings.has_approved_price IS '是否已经存在可继续对外服务的已审核价格';
COMMENT ON COLUMN merchant_model_listings.pending_price_currency IS '待审核或等待生效的新价格币种；没有价格变更时为空';
COMMENT ON COLUMN merchant_model_listings.pending_input_price_nano_per_million IS '待审核或等待生效的每百万输入 Token 价格，按所选币种的一亿分之一单位存储';
COMMENT ON COLUMN merchant_model_listings.pending_output_price_nano_per_million IS '待审核或等待生效的每百万输出 Token 价格，按所选币种的一亿分之一单位存储';
COMMENT ON COLUMN merchant_model_listings.pending_pricing_nano IS '待审核或等待生效的完整销售价格规则，金额按所选币种的一亿分之一单位存储';
COMMENT ON COLUMN merchant_model_listings.price_effective_at IS '价格审核通过后的计划生效时间；为空表示没有等待生效的价格';
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
DROP INDEX IF EXISTS merchant_model_listings_price_effective_at_idx;
DROP INDEX IF EXISTS merchant_model_listings_review_status_submitted_at_idx;

ALTER TABLE merchant_model_listings
    DROP CONSTRAINT IF EXISTS merchant_model_listings_price_effective_state_valid,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_published_has_approved_price,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_status_valid;

UPDATE merchant_model_listings
SET status = CASE review_status
    WHEN 'pending' THEN 'review'
    WHEN 'rejected' THEN 'rejected'
    ELSE status
END;

ALTER TABLE merchant_model_listings
    ALTER COLUMN status SET DEFAULT 'draft',
    ADD CONSTRAINT merchant_model_listings_status_valid
        CHECK (status IN ('draft', 'review', 'rejected', 'offline', 'published'));

CREATE INDEX merchant_model_listings_review_status_submitted_at_idx
    ON merchant_model_listings (status, review_submitted_at DESC, id DESC);

ALTER TABLE merchant_model_listings
    DROP CONSTRAINT IF EXISTS merchant_model_listings_pending_price_complete,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_pending_output_price_non_negative,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_pending_input_price_non_negative,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_pending_price_currency_valid,
    DROP CONSTRAINT IF EXISTS merchant_model_listings_review_status_valid,
    DROP COLUMN IF EXISTS price_effective_at,
    DROP COLUMN IF EXISTS pending_pricing_nano,
    DROP COLUMN IF EXISTS pending_output_price_nano_per_million,
    DROP COLUMN IF EXISTS pending_input_price_nano_per_million,
    DROP COLUMN IF EXISTS pending_price_currency,
    DROP COLUMN IF EXISTS has_approved_price,
    DROP COLUMN IF EXISTS review_status;

COMMENT ON COLUMN merchant_model_listings.status
    IS '模型上架状态：draft 草稿、review 审核中、rejected 已拒绝、offline 已下架、published 已上架';

DROP TABLE model_price_review_settings;
"#,
            )
            .await?;

        Ok(())
    }
}

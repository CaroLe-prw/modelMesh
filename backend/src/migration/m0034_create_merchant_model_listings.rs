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
CREATE UNIQUE INDEX merchant_channels_id_user_unique
    ON merchant_channels (id, merchant_user_id);

CREATE TABLE merchant_model_listings (
    id UUID PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    context_window BIGINT NOT NULL,
    input_price_nano_usd_per_million BIGINT NOT NULL,
    output_price_nano_usd_per_million BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_model_listings_context_window_positive CHECK (context_window > 0),
    CONSTRAINT merchant_model_listings_input_price_non_negative
        CHECK (input_price_nano_usd_per_million >= 0),
    CONSTRAINT merchant_model_listings_output_price_non_negative
        CHECK (output_price_nano_usd_per_million >= 0),
    CONSTRAINT merchant_model_listings_status_valid
        CHECK (status IN ('draft', 'review', 'published')),
    CONSTRAINT merchant_model_listings_channel_owner_fkey
        FOREIGN KEY (channel_id, merchant_user_id)
        REFERENCES merchant_channels(id, merchant_user_id)
        ON DELETE CASCADE,
    CONSTRAINT merchant_model_listings_channel_model_unique UNIQUE (channel_id, model_id)
);

COMMENT ON TABLE merchant_model_listings IS '商户通过自有渠道向模型广场提供的模型上架配置';
COMMENT ON COLUMN merchant_model_listings.id IS '服务端生成的模型上架唯一标识';
COMMENT ON COLUMN merchant_model_listings.merchant_user_id IS '拥有该模型上架配置的商户用户标识';
COMMENT ON COLUMN merchant_model_listings.channel_id IS '承载该模型调用的商户渠道标识';
COMMENT ON COLUMN merchant_model_listings.model_id IS '关联的管理员正式模型目录标识';
COMMENT ON COLUMN merchant_model_listings.context_window IS '商户渠道实际支持的最大上下文 Token 数';
COMMENT ON COLUMN merchant_model_listings.input_price_nano_usd_per_million IS '商户每百万输入 Token 的销售美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN merchant_model_listings.output_price_nano_usd_per_million IS '商户每百万输出 Token 的销售美元价格，按一亿分之一美元存储';
COMMENT ON COLUMN merchant_model_listings.status IS '上架状态：draft、review 或 published';
COMMENT ON COLUMN merchant_model_listings.created_at IS '模型上架配置创建时间';
COMMENT ON COLUMN merchant_model_listings.updated_at IS '模型上架配置最后更新时间';

CREATE INDEX merchant_model_listings_user_updated_at_idx
    ON merchant_model_listings (merchant_user_id, updated_at DESC, id DESC);
CREATE INDEX merchant_model_listings_published_model_idx
    ON merchant_model_listings (model_id, status, updated_at DESC);

CREATE FUNCTION refresh_merchant_channel_model_count() RETURNS TRIGGER AS $trigger$
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.channel_id <> NEW.channel_id) THEN
        UPDATE merchant_channels
        SET model_count = (
            SELECT COUNT(*) FROM merchant_model_listings WHERE channel_id = OLD.channel_id
        )
        WHERE id = OLD.channel_id;
    END IF;

    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.channel_id <> NEW.channel_id) THEN
        UPDATE merchant_channels
        SET model_count = (
            SELECT COUNT(*) FROM merchant_model_listings WHERE channel_id = NEW.channel_id
        )
        WHERE id = NEW.channel_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

CREATE TRIGGER merchant_model_listings_refresh_channel_count
AFTER INSERT OR DELETE OR UPDATE OF channel_id ON merchant_model_listings
FOR EACH ROW EXECUTE FUNCTION refresh_merchant_channel_model_count();
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
DROP TRIGGER IF EXISTS merchant_model_listings_refresh_channel_count
    ON merchant_model_listings;
DROP FUNCTION IF EXISTS refresh_merchant_channel_model_count();
DROP TABLE merchant_model_listings;
DROP INDEX merchant_channels_id_user_unique;
"#,
            )
            .await?;

        Ok(())
    }
}

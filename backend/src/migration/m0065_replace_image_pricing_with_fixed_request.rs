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
UPDATE models
SET default_pricing_nano_usd = jsonb_set(
        default_pricing_nano_usd,
        '{base}',
        COALESCE(default_pricing_nano_usd->'base', '{}'::jsonb) || jsonb_build_object(
            'request',
            COALESCE(
                (default_pricing_nano_usd->'base'->>'request')::BIGINT,
                (default_pricing_nano_usd->'base'->>'image_1k')::BIGINT,
                (default_pricing_nano_usd->'base'->>'image_2k')::BIGINT,
                (default_pricing_nano_usd->'base'->>'image_4k')::BIGINT,
                0
            )
        ),
        true
    ),
    pricing_overrides_nano_usd = jsonb_set(
        pricing_overrides_nano_usd,
        '{base}',
        COALESCE(pricing_overrides_nano_usd->'base', '{}'::jsonb) || jsonb_build_object(
            'request',
            COALESCE(
                (pricing_overrides_nano_usd->'base'->>'request')::BIGINT,
                (pricing_overrides_nano_usd->'base'->>'image_1k')::BIGINT,
                (pricing_overrides_nano_usd->'base'->>'image_2k')::BIGINT,
                (pricing_overrides_nano_usd->'base'->>'image_4k')::BIGINT,
                0
            )
        ),
        true
    )
WHERE billing_mode = 'image';

UPDATE merchant_model_listings AS listing
SET pricing_nano = jsonb_set(
        listing.pricing_nano,
        '{base}',
        COALESCE(listing.pricing_nano->'base', '{}'::jsonb) || jsonb_build_object(
            'request',
            COALESCE(
                (listing.pricing_nano->'base'->>'request')::BIGINT,
                (listing.pricing_nano->'base'->>'image_1k')::BIGINT,
                (listing.pricing_nano->'base'->>'image_2k')::BIGINT,
                (listing.pricing_nano->'base'->>'image_4k')::BIGINT,
                0
            )
        ),
        true
    ),
    pending_pricing_nano = CASE
        WHEN listing.pending_pricing_nano IS NULL THEN NULL
        ELSE jsonb_set(
            listing.pending_pricing_nano,
            '{base}',
            COALESCE(listing.pending_pricing_nano->'base', '{}'::jsonb) || jsonb_build_object(
                'request',
                COALESCE(
                    (listing.pending_pricing_nano->'base'->>'request')::BIGINT,
                    (listing.pending_pricing_nano->'base'->>'image_1k')::BIGINT,
                    (listing.pending_pricing_nano->'base'->>'image_2k')::BIGINT,
                    (listing.pending_pricing_nano->'base'->>'image_4k')::BIGINT,
                    0
                )
            ),
            true
        )
    END
FROM models
WHERE listing.model_id = models.id
  AND models.billing_mode = 'image'
  AND listing.billing_mode = 'request';

ALTER TABLE models DROP CONSTRAINT models_billing_mode_valid;
UPDATE models SET billing_mode = 'request' WHERE billing_mode = 'image';
ALTER TABLE models ADD CONSTRAINT models_billing_mode_valid
    CHECK (billing_mode IN ('token', 'request'));

COMMENT ON COLUMN models.billing_mode IS '模型默认计费方式：token 按 Token 计费，request 按调用次数使用固定价格';
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
ALTER TABLE models DROP CONSTRAINT models_billing_mode_valid;
UPDATE models SET billing_mode = 'image' WHERE billing_mode = 'request';
ALTER TABLE models ADD CONSTRAINT models_billing_mode_valid
    CHECK (billing_mode IN ('token', 'image'));

COMMENT ON COLUMN models.billing_mode IS '模型计费方式：token 按 Token 计费，image 按图片生成次数与分辨率计费';
"#,
            )
            .await?;

        Ok(())
    }
}

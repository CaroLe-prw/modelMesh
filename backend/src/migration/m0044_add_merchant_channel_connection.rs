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
    ADD COLUMN base_url VARCHAR(2048) NOT NULL DEFAULT '',
    ADD COLUMN api_key_ciphertext TEXT NOT NULL DEFAULT '',
    ADD COLUMN description VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN supported_models JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD CONSTRAINT merchant_channels_base_url_valid
        CHECK (CHAR_LENGTH(base_url) <= 2048),
    ADD CONSTRAINT merchant_channels_api_key_ciphertext_valid
        CHECK (CHAR_LENGTH(api_key_ciphertext) <= 16384),
    ADD CONSTRAINT merchant_channels_description_valid
        CHECK (CHAR_LENGTH(description) <= 500),
    ADD CONSTRAINT merchant_channels_supported_models_valid
        CHECK (
            jsonb_typeof(supported_models) = 'array'
            AND jsonb_array_length(supported_models) <= 2000
        );

COMMENT ON COLUMN merchant_channels.base_url
    IS '模型供应商兼容 API 的基础地址；历史渠道在重新编辑前允许为空';
COMMENT ON COLUMN merchant_channels.api_key_ciphertext
    IS '使用服务端凭据密钥进行 AEAD 加密后的供应商 API Key；任何接口均不得明文返回';
COMMENT ON COLUMN merchant_channels.description
    IS '商户填写的渠道能力、线路或稳定性说明';
COMMENT ON COLUMN merchant_channels.supported_models
    IS '从供应商模型接口获取或由商户手动确认的模型标识列表';
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
    DROP CONSTRAINT IF EXISTS merchant_channels_supported_models_valid,
    DROP CONSTRAINT IF EXISTS merchant_channels_description_valid,
    DROP CONSTRAINT IF EXISTS merchant_channels_api_key_ciphertext_valid,
    DROP CONSTRAINT IF EXISTS merchant_channels_base_url_valid,
    DROP COLUMN IF EXISTS supported_models,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS api_key_ciphertext,
    DROP COLUMN IF EXISTS base_url;
"#,
            )
            .await?;

        Ok(())
    }
}

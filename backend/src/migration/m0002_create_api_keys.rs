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
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(48) NOT NULL,
    key_hash CHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,
    key_suffix CHAR(4) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    ip_restriction_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ip_whitelist TEXT NOT NULL DEFAULT '',
    ip_blacklist TEXT NOT NULL DEFAULT '',
    quota_limit_microusd BIGINT NOT NULL DEFAULT 0,
    rate_limit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    five_hour_limit_microusd BIGINT NOT NULL DEFAULT 0,
    daily_limit_microusd BIGINT NOT NULL DEFAULT 0,
    weekly_limit_microusd BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT api_keys_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT api_keys_status_valid CHECK (status IN ('active', 'paused')),
    CONSTRAINT api_keys_quota_limit_non_negative CHECK (quota_limit_microusd >= 0),
    CONSTRAINT api_keys_five_hour_limit_non_negative CHECK (five_hour_limit_microusd >= 0),
    CONSTRAINT api_keys_daily_limit_non_negative CHECK (daily_limit_microusd >= 0),
    CONSTRAINT api_keys_weekly_limit_non_negative CHECK (weekly_limit_microusd >= 0)
);

COMMENT ON TABLE api_keys IS '用户调用 ModelMesh API 使用的访问密钥';
COMMENT ON COLUMN api_keys.id IS '服务端生成的 API 密钥唯一标识';
COMMENT ON COLUMN api_keys.user_id IS '拥有该 API 密钥的用户标识';
COMMENT ON COLUMN api_keys.name IS '用户设置的 API 密钥名称，同一用户内唯一';
COMMENT ON COLUMN api_keys.key_hash IS 'API 密钥正文的 SHA-256 哈希，服务端不保存明文';
COMMENT ON COLUMN api_keys.key_prefix IS '用于列表遮罩展示的密钥前缀';
COMMENT ON COLUMN api_keys.key_suffix IS '用于列表遮罩展示的密钥末四位';
COMMENT ON COLUMN api_keys.status IS 'API 密钥状态：active 或 paused';
COMMENT ON COLUMN api_keys.ip_restriction_enabled IS '是否启用来源 IP 限制';
COMMENT ON COLUMN api_keys.ip_whitelist IS '每行一个允许访问的 IP 地址或 CIDR';
COMMENT ON COLUMN api_keys.ip_blacklist IS '每行一个禁止访问的 IP 地址或 CIDR';
COMMENT ON COLUMN api_keys.quota_limit_microusd IS '密钥总消费额度，单位为微美元，0 表示无限制';
COMMENT ON COLUMN api_keys.rate_limit_enabled IS '是否启用周期消费额度';
COMMENT ON COLUMN api_keys.five_hour_limit_microusd IS '五小时消费额度，单位为微美元，0 表示无限制';
COMMENT ON COLUMN api_keys.daily_limit_microusd IS '每日消费额度，单位为微美元，0 表示无限制';
COMMENT ON COLUMN api_keys.weekly_limit_microusd IS '每周消费额度，单位为微美元，0 表示无限制';
COMMENT ON COLUMN api_keys.expires_at IS 'API 密钥自动失效时间，空值表示永久有效';
COMMENT ON COLUMN api_keys.created_at IS 'API 密钥创建时间';
COMMENT ON COLUMN api_keys.updated_at IS 'API 密钥最后更新时间';

CREATE INDEX api_keys_user_created_at_idx ON api_keys (user_id, created_at DESC);
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("api_keys")).to_owned())
            .await
    }
}

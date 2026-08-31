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
CREATE TABLE merchant_profiles (
    merchant_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    merchant_code VARCHAR(32) NOT NULL,
    business_name VARCHAR(120) NOT NULL,
    website VARCHAR(255) NOT NULL DEFAULT '',
    industry VARCHAR(80) NOT NULL,
    contact_name VARCHAR(80) NOT NULL,
    contact_email VARCHAR(254) NOT NULL,
    contact_phone VARCHAR(32) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_profiles_code_unique UNIQUE (merchant_code),
    CONSTRAINT merchant_profiles_code_valid CHECK (merchant_code ~ '^MM-[0-9]{4}-[0-9]{6,}$'),
    CONSTRAINT merchant_profiles_business_name_not_blank CHECK (BTRIM(business_name) <> ''),
    CONSTRAINT merchant_profiles_industry_not_blank CHECK (BTRIM(industry) <> ''),
    CONSTRAINT merchant_profiles_contact_name_not_blank CHECK (BTRIM(contact_name) <> ''),
    CONSTRAINT merchant_profiles_contact_email_not_blank CHECK (BTRIM(contact_email) <> '')
);

COMMENT ON TABLE merchant_profiles IS '商户企业公开资料与审核、结算通知联系人信息';
COMMENT ON COLUMN merchant_profiles.merchant_user_id IS '拥有该资料的商户用户标识，同时作为主键';
COMMENT ON COLUMN merchant_profiles.merchant_code IS '面向商户展示的稳定商户编号';
COMMENT ON COLUMN merchant_profiles.business_name IS '企业或经营主体名称';
COMMENT ON COLUMN merchant_profiles.website IS '企业官方网站；空字符串表示未填写';
COMMENT ON COLUMN merchant_profiles.industry IS '企业所属行业';
COMMENT ON COLUMN merchant_profiles.contact_name IS '接收业务通知的联系人姓名';
COMMENT ON COLUMN merchant_profiles.contact_email IS '接收审核和结算通知的联系人邮箱';
COMMENT ON COLUMN merchant_profiles.contact_phone IS '联系人电话；空字符串表示未填写';
COMMENT ON COLUMN merchant_profiles.created_at IS '商户资料创建时间';
COMMENT ON COLUMN merchant_profiles.updated_at IS '商户资料最后更新时间';

INSERT INTO merchant_profiles (
    merchant_user_id,
    merchant_code,
    business_name,
    website,
    industry,
    contact_name,
    contact_email,
    contact_phone,
    created_at,
    updated_at
)
SELECT
    users.id,
    CONCAT('MM-', TO_CHAR(users.created_at, 'YYYY'), '-', LPAD(users.id::TEXT, 6, '0')),
    COALESCE(NULLIF(applications.business_name, ''), users.username),
    COALESCE(applications.website, ''),
    'AI services',
    users.username,
    users.email,
    '',
    users.created_at,
    NOW()
FROM users
LEFT JOIN merchant_applications AS applications ON applications.user_id = users.id
WHERE users.role IN ('merchant', 'admin')
ON CONFLICT (merchant_user_id) DO NOTHING;

CREATE TABLE merchant_settlement_accounts (
    id UUID PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_name VARCHAR(120) NOT NULL,
    method VARCHAR(16) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    account_ciphertext TEXT NOT NULL,
    account_masked VARCHAR(160) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_settlement_accounts_entity_not_blank CHECK (BTRIM(entity_name) <> ''),
    CONSTRAINT merchant_settlement_accounts_method_valid CHECK (method IN ('bank', 'usdt')),
    CONSTRAINT merchant_settlement_accounts_currency_valid CHECK (currency IN ('USD', 'USDT')),
    CONSTRAINT merchant_settlement_accounts_method_currency_valid CHECK (
        (method = 'bank' AND currency = 'USD')
        OR (method = 'usdt' AND currency = 'USDT')
    ),
    CONSTRAINT merchant_settlement_accounts_ciphertext_not_blank
        CHECK (BTRIM(account_ciphertext) <> ''),
    CONSTRAINT merchant_settlement_accounts_masked_not_blank CHECK (BTRIM(account_masked) <> '')
);

COMMENT ON TABLE merchant_settlement_accounts IS '商户提款使用的加密银行账户与 USDT 钱包配置';
COMMENT ON COLUMN merchant_settlement_accounts.id IS '服务端生成的结算账户 UUID';
COMMENT ON COLUMN merchant_settlement_accounts.merchant_user_id IS '拥有该结算账户的商户用户标识';
COMMENT ON COLUMN merchant_settlement_accounts.entity_name IS '结算账户开户主体或钱包所属主体';
COMMENT ON COLUMN merchant_settlement_accounts.method IS '结算方式：bank 银行账户或 usdt 钱包';
COMMENT ON COLUMN merchant_settlement_accounts.currency IS '结算币种：USD 或 USDT';
COMMENT ON COLUMN merchant_settlement_accounts.account_ciphertext IS '使用服务端凭据密钥加密后的完整账户信息';
COMMENT ON COLUMN merchant_settlement_accounts.account_masked IS '仅用于界面展示的账户遮罩值';
COMMENT ON COLUMN merchant_settlement_accounts.is_default IS '是否为商户当前默认到账账户';
COMMENT ON COLUMN merchant_settlement_accounts.created_at IS '结算账户创建时间';
COMMENT ON COLUMN merchant_settlement_accounts.updated_at IS '结算账户最后更新时间';

CREATE UNIQUE INDEX merchant_settlement_accounts_one_default_idx
    ON merchant_settlement_accounts (merchant_user_id)
    WHERE is_default;
CREATE INDEX merchant_settlement_accounts_user_created_at_idx
    ON merchant_settlement_accounts (merchant_user_id, created_at ASC, id ASC);
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
DROP TABLE merchant_settlement_accounts;
DROP TABLE merchant_profiles;
"#,
            )
            .await?;

        Ok(())
    }
}

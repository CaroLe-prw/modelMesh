use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP_SQL).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE merchant_withdrawals;")
            .await?;
        Ok(())
    }
}

const UP_SQL: &str = r#"
CREATE TABLE merchant_withdrawals (
    id UUID PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    settlement_account_id UUID REFERENCES merchant_settlement_accounts(id) ON DELETE SET NULL,
    entity_name VARCHAR(120) NOT NULL,
    method VARCHAR(16) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    network VARCHAR(16),
    account_ciphertext TEXT NOT NULL,
    account_encryption_context VARCHAR(80) NOT NULL,
    account_masked VARCHAR(160) NOT NULL,
    amount_microusd BIGINT NOT NULL,
    fee_microusd BIGINT NOT NULL,
    net_amount_microusd BIGINT NOT NULL,
    balance_after_microusd BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'processing',
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_withdrawals_entity_not_blank CHECK (BTRIM(entity_name) <> ''),
    CONSTRAINT merchant_withdrawals_method_valid CHECK (method IN ('bank', 'alipay', 'usdt')),
    CONSTRAINT merchant_withdrawals_currency_valid CHECK (currency IN ('CNY', 'USD', 'USDT')),
    CONSTRAINT merchant_withdrawals_method_currency_network_valid CHECK (
        (method = 'bank' AND currency IN ('CNY', 'USD') AND network IS NULL)
        OR (method = 'alipay' AND currency = 'CNY' AND network IS NULL)
        OR (method = 'usdt' AND currency = 'USDT' AND network IN ('TRC20', 'ERC20', 'BEP20', 'POLYGON'))
    ),
    CONSTRAINT merchant_withdrawals_account_masked_not_blank CHECK (BTRIM(account_masked) <> ''),
    CONSTRAINT merchant_withdrawals_account_ciphertext_not_blank
        CHECK (BTRIM(account_ciphertext) <> ''),
    CONSTRAINT merchant_withdrawals_account_encryption_context_not_blank
        CHECK (BTRIM(account_encryption_context) <> ''),
    CONSTRAINT merchant_withdrawals_amount_valid CHECK (amount_microusd > 0),
    CONSTRAINT merchant_withdrawals_fee_valid CHECK (fee_microusd >= 0 AND fee_microusd < amount_microusd),
    CONSTRAINT merchant_withdrawals_net_amount_valid CHECK (
        net_amount_microusd = amount_microusd - fee_microusd
        AND net_amount_microusd > 0
    ),
    CONSTRAINT merchant_withdrawals_balance_after_valid CHECK (
        balance_after_microusd BETWEEN 0 AND 9007199254740991
    ),
    CONSTRAINT merchant_withdrawals_status_valid CHECK (status IN ('processing', 'paid', 'rejected')),
    CONSTRAINT merchant_withdrawals_review_note_length CHECK (CHAR_LENGTH(review_note) <= 500),
    CONSTRAINT merchant_withdrawals_review_state_valid CHECK (
        (status = 'processing' AND reviewed_at IS NULL)
        OR (status IN ('paid', 'rejected') AND reviewed_at IS NOT NULL)
    )
);

COMMENT ON TABLE merchant_withdrawals IS '商户提款申请、到账快照、余额扣减结果与审核记录';
COMMENT ON COLUMN merchant_withdrawals.id IS '服务端生成的提款申请 UUID';
COMMENT ON COLUMN merchant_withdrawals.merchant_user_id IS '提交提款申请的商户用户编号';
COMMENT ON COLUMN merchant_withdrawals.settlement_account_id IS '提交时选择的结算账户；账户删除后置空并保留快照';
COMMENT ON COLUMN merchant_withdrawals.entity_name IS '提交时的结算主体名称快照';
COMMENT ON COLUMN merchant_withdrawals.method IS '提交时的结算方式快照：bank、alipay 或 usdt';
COMMENT ON COLUMN merchant_withdrawals.currency IS '提交时的结算币种快照：CNY、USD 或 USDT';
COMMENT ON COLUMN merchant_withdrawals.network IS 'USDT 网络快照；非 USDT 结算为空';
COMMENT ON COLUMN merchant_withdrawals.account_ciphertext IS '提交时的到账账户加密快照，仅供后端结算，不通过接口返回';
COMMENT ON COLUMN merchant_withdrawals.account_encryption_context IS '解密到账账户快照所需的非敏感上下文，不通过接口返回';
COMMENT ON COLUMN merchant_withdrawals.account_masked IS '提交时的到账账户遮罩值，不保存明文';
COMMENT ON COLUMN merchant_withdrawals.amount_microusd IS '从商户可提现余额扣减的申请金额，单位为百万分之一美元';
COMMENT ON COLUMN merchant_withdrawals.fee_microusd IS '按提交时平台费率计算的手续费，单位为百万分之一美元';
COMMENT ON COLUMN merchant_withdrawals.net_amount_microusd IS '预计到账净额，等于申请金额减手续费';
COMMENT ON COLUMN merchant_withdrawals.balance_after_microusd IS '提交并预占资金后的商户可提现余额';
COMMENT ON COLUMN merchant_withdrawals.status IS '提款状态：processing 处理中、paid 已到账或 rejected 已拒绝';
COMMENT ON COLUMN merchant_withdrawals.review_note IS '管理员处理说明，最长 500 个字符';
COMMENT ON COLUMN merchant_withdrawals.reviewed_by IS '处理提款申请的管理员用户编号；管理员删除后置空';
COMMENT ON COLUMN merchant_withdrawals.reviewed_at IS '管理员完成处理的时间；处理中为空';
COMMENT ON COLUMN merchant_withdrawals.created_at IS '提款申请提交时间';
COMMENT ON COLUMN merchant_withdrawals.updated_at IS '提款申请最后更新时间';

CREATE INDEX merchant_withdrawals_merchant_created_idx
    ON merchant_withdrawals (merchant_user_id, created_at DESC, id DESC);
CREATE INDEX merchant_withdrawals_status_created_idx
    ON merchant_withdrawals (status, created_at ASC, id ASC);
"#;

#[cfg(test)]
#[path = "../../tests/unit/migration_merchant_withdrawals.rs"]
mod tests;

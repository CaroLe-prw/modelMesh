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
CREATE TABLE user_balance_adjustments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    operator_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    adjustment_type VARCHAR(16) NOT NULL,
    amount_microusd BIGINT NOT NULL,
    balance_after_microusd BIGINT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_balance_adjustments_type_valid
        CHECK (adjustment_type IN ('deposit', 'refund')),
    CONSTRAINT user_balance_adjustments_amount_valid
        CHECK (amount_microusd > 0),
    CONSTRAINT user_balance_adjustments_balance_valid
        CHECK (balance_after_microusd BETWEEN 0 AND 9007199254740991),
    CONSTRAINT user_balance_adjustments_notes_valid
        CHECK (CHAR_LENGTH(notes) <= 1000)
);

COMMENT ON TABLE user_balance_adjustments IS '管理员对用户余额执行充值或退款时生成的不可变审计记录';
COMMENT ON COLUMN user_balance_adjustments.id IS '余额调整记录的数据库主键';
COMMENT ON COLUMN user_balance_adjustments.user_id IS '被调整余额的用户编号';
COMMENT ON COLUMN user_balance_adjustments.operator_user_id IS '执行余额调整的管理员用户编号';
COMMENT ON COLUMN user_balance_adjustments.adjustment_type IS '余额调整类型：充值或退款';
COMMENT ON COLUMN user_balance_adjustments.amount_microusd IS '本次调整金额，单位为百万分之一美元且始终为正数';
COMMENT ON COLUMN user_balance_adjustments.balance_after_microusd IS '调整完成后的用户余额，单位为百万分之一美元';
COMMENT ON COLUMN user_balance_adjustments.notes IS '管理员填写的余额调整备注，最多 1000 个字符';
COMMENT ON COLUMN user_balance_adjustments.created_at IS '余额调整记录的创建时间';

CREATE INDEX idx_user_balance_adjustments_user_created
    ON user_balance_adjustments (user_id, created_at DESC, id DESC);
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE user_balance_adjustments;")
            .await?;

        Ok(())
    }
}

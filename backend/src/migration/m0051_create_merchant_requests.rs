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
CREATE TABLE merchant_requests (
    id UUID PRIMARY KEY,
    request_code VARCHAR(35) NOT NULL,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(24) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    review_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_requests_request_code_unique UNIQUE (request_code),
    CONSTRAINT merchant_requests_request_code_valid
        CHECK (request_code ~ '^mr_[A-F0-9]{32}$'),
    CONSTRAINT merchant_requests_type_valid
        CHECK (request_type IN ('channel_access', 'model_review', 'quota_adjustment')),
    CONSTRAINT merchant_requests_subject_not_blank CHECK (BTRIM(subject) <> ''),
    CONSTRAINT merchant_requests_description_not_blank CHECK (BTRIM(description) <> ''),
    CONSTRAINT merchant_requests_status_valid
        CHECK (status IN ('pending', 'changes_requested', 'approved'))
);

COMMENT ON TABLE merchant_requests IS '商户提交并跟踪渠道接入、模型审核和额度调整等业务申请';
COMMENT ON COLUMN merchant_requests.id IS '服务端生成的商户请求内部唯一标识';
COMMENT ON COLUMN merchant_requests.request_code IS '面向商户展示的请求编号，由内部 UUID 生成并保持唯一';
COMMENT ON COLUMN merchant_requests.merchant_user_id IS '提交该请求的商户用户标识';
COMMENT ON COLUMN merchant_requests.request_type IS '请求类型：channel_access、model_review 或 quota_adjustment';
COMMENT ON COLUMN merchant_requests.subject IS '商户填写的请求主题';
COMMENT ON COLUMN merchant_requests.description IS '商户填写的业务背景、目标和补充说明';
COMMENT ON COLUMN merchant_requests.status IS '审核状态：pending、changes_requested 或 approved';
COMMENT ON COLUMN merchant_requests.review_note IS '平台审核意见或需要商户补充的资料说明';
COMMENT ON COLUMN merchant_requests.created_at IS '请求提交时间';
COMMENT ON COLUMN merchant_requests.updated_at IS '请求内容或审核状态最后更新时间';

CREATE INDEX merchant_requests_user_updated_at_idx
    ON merchant_requests (merchant_user_id, updated_at DESC, id DESC);
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("merchant_requests"))
                    .to_owned(),
            )
            .await
    }
}

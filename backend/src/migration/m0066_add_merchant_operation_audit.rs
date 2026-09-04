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
            .execute_unprepared(DOWN_SQL)
            .await?;
        Ok(())
    }
}

const UP_SQL: &str = r#"
ALTER TABLE merchant_business_logs
    ADD COLUMN operator_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN operator_source VARCHAR(16) NOT NULL DEFAULT 'system',
    ADD COLUMN operation_reason TEXT NOT NULL DEFAULT '',
    ADD CONSTRAINT merchant_business_logs_operator_source_valid
        CHECK (operator_source IN ('merchant', 'admin', 'system')),
    ADD CONSTRAINT merchant_business_logs_operation_reason_length
        CHECK (CHAR_LENGTH(operation_reason) <= 500);

UPDATE merchant_business_logs
SET operator_user_id = CASE
        WHEN origin IN ('manual', 'channel_review', 'model_review') THEN merchant_user_id
        ELSE NULL
    END,
    operator_source = CASE
        WHEN origin IN ('manual', 'channel_review', 'model_review') THEN 'merchant'
        ELSE 'system'
    END;

COMMENT ON COLUMN merchant_business_logs.operator_user_id IS '执行操作的用户编号；系统任务为空，用户删除后保留日志并置空';
COMMENT ON COLUMN merchant_business_logs.operator_source IS '操作来源：merchant 商户、admin 管理员或 system 系统任务';
COMMENT ON COLUMN merchant_business_logs.operation_reason IS '管理员下线等资源操作的原因，最长 500 个字符';

CREATE FUNCTION populate_merchant_business_log_operator()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    configured_operator TEXT;
    configured_source TEXT;
    configured_reason TEXT;
BEGIN
    configured_operator = NULLIF(current_setting('modelmesh.operator_user_id', TRUE), '');
    configured_source = NULLIF(current_setting('modelmesh.operator_source', TRUE), '');
    configured_reason = current_setting('modelmesh.operation_reason', TRUE);

    IF configured_operator IS NOT NULL THEN
        NEW.operator_user_id = configured_operator::BIGINT;
    ELSIF NEW.operator_user_id IS NULL
        AND NEW.origin IN ('manual', 'channel_review', 'model_review')
    THEN
        NEW.operator_user_id = NEW.merchant_user_id;
    END IF;

    NEW.operator_source = COALESCE(
        configured_source,
        CASE
            WHEN NEW.origin IN ('manual', 'channel_review', 'model_review') THEN 'merchant'
            ELSE NULL
        END,
        NULLIF(NEW.operator_source, ''),
        'system'
    );
    NEW.operation_reason = COALESCE(configured_reason, NEW.operation_reason, '');
    RETURN NEW;
END;
$$;

CREATE TRIGGER merchant_business_logs_operator
BEFORE INSERT ON merchant_business_logs
FOR EACH ROW
EXECUTE FUNCTION populate_merchant_business_log_operator();
"#;

const DOWN_SQL: &str = r#"
DROP TRIGGER IF EXISTS merchant_business_logs_operator ON merchant_business_logs;
DROP FUNCTION IF EXISTS populate_merchant_business_log_operator();
ALTER TABLE merchant_business_logs
    DROP CONSTRAINT IF EXISTS merchant_business_logs_operation_reason_length,
    DROP CONSTRAINT IF EXISTS merchant_business_logs_operator_source_valid,
    DROP COLUMN IF EXISTS operation_reason,
    DROP COLUMN IF EXISTS operator_source,
    DROP COLUMN IF EXISTS operator_user_id;
"#;

#[cfg(test)]
#[path = "../../tests/unit/migration_merchant_operation_audit.rs"]
mod tests;

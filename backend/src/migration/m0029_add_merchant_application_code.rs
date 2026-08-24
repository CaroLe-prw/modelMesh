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
ALTER TABLE merchant_applications
    ADD COLUMN application_code VARCHAR(48);

UPDATE merchant_applications
SET application_code = CONCAT(
    'MA-',
    FLOOR(EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    '-',
    UPPER(SUBSTRING(MD5(CONCAT(id, ':', created_at, ':', RANDOM())) FROM 1 FOR 12))
)
WHERE application_code IS NULL;

ALTER TABLE merchant_applications
    ALTER COLUMN application_code SET DEFAULT CONCAT(
        'MA-',
        FLOOR(EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT,
        '-',
        UPPER(SUBSTRING(MD5(CONCAT(CLOCK_TIMESTAMP(), ':', RANDOM())) FROM 1 FOR 12))
    ),
    ALTER COLUMN application_code SET NOT NULL,
    ADD CONSTRAINT merchant_applications_application_code_unique UNIQUE (application_code),
    ADD CONSTRAINT merchant_applications_application_code_valid
        CHECK (application_code ~ '^MA-[0-9]{13,}-[A-F0-9]{12}$');

COMMENT ON COLUMN merchant_applications.application_code IS '对用户展示的商户申请编号，由申请时间毫秒值与随机片段组成并保持唯一';
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
ALTER TABLE merchant_applications
    DROP COLUMN application_code;
"#,
            )
            .await?;

        Ok(())
    }
}

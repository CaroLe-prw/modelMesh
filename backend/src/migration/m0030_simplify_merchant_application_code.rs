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
    DROP CONSTRAINT merchant_applications_application_code_valid;

UPDATE merchant_applications
SET application_code = CONCAT(
    TO_CHAR(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYYMMDDHH24MISS'),
    LPAD(FLOOR(RANDOM() * 100000)::INTEGER::TEXT, 5, '0')
);

ALTER TABLE merchant_applications
    ALTER COLUMN application_code TYPE VARCHAR(19),
    ALTER COLUMN application_code SET DEFAULT CONCAT(
        TO_CHAR(CLOCK_TIMESTAMP() AT TIME ZONE 'Asia/Shanghai', 'YYYYMMDDHH24MISS'),
        LPAD(FLOOR(RANDOM() * 100000)::INTEGER::TEXT, 5, '0')
    ),
    ADD CONSTRAINT merchant_applications_application_code_valid
        CHECK (application_code ~ '^[0-9]{19}$');

COMMENT ON COLUMN merchant_applications.application_code IS '对用户展示的 19 位商户申请编号，由北京时间年月日时分秒与 5 位随机数组成并保持唯一';
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
    DROP CONSTRAINT merchant_applications_application_code_valid,
    ALTER COLUMN application_code TYPE VARCHAR(48);

UPDATE merchant_applications
SET application_code = CONCAT(
    'MA-',
    FLOOR(EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    '-',
    UPPER(SUBSTRING(MD5(CONCAT(id, ':', created_at, ':', RANDOM())) FROM 1 FOR 12))
);

ALTER TABLE merchant_applications
    ALTER COLUMN application_code SET DEFAULT CONCAT(
        'MA-',
        FLOOR(EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT,
        '-',
        UPPER(SUBSTRING(MD5(CONCAT(CLOCK_TIMESTAMP(), ':', RANDOM())) FROM 1 FOR 12))
    ),
    ADD CONSTRAINT merchant_applications_application_code_valid
        CHECK (application_code ~ '^MA-[0-9]{13,}-[A-F0-9]{12}$');
"#,
            )
            .await?;

        Ok(())
    }
}

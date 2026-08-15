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
ALTER TABLE users
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active',
    ADD COLUMN balance_microusd BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN concurrency_limit BIGINT NOT NULL DEFAULT 100000,
    ADD COLUMN rpm_limit BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN last_login_at TIMESTAMPTZ,
    ADD COLUMN last_login_ip INET,
    ADD CONSTRAINT users_status_valid CHECK (status IN ('active', 'disabled')),
    ADD CONSTRAINT users_balance_microusd_valid
        CHECK (balance_microusd BETWEEN 0 AND 9007199254740991),
    ADD CONSTRAINT users_concurrency_limit_valid
        CHECK (concurrency_limit BETWEEN 0 AND 4294967295),
    ADD CONSTRAINT users_rpm_limit_valid
        CHECK (rpm_limit BETWEEN 0 AND 4294967295);

COMMENT ON COLUMN users.status IS '账号状态：正常或已停用';
COMMENT ON COLUMN users.balance_microusd IS '账号当前可用余额，单位为百万分之一美元';
COMMENT ON COLUMN users.concurrency_limit IS '用户级最大并发请求数；0 表示不限制，在分组未配置时作为兜底';
COMMENT ON COLUMN users.rpm_limit IS '用户级每分钟最大请求数；0 表示不限制，在分组未配置时作为兜底';
COMMENT ON COLUMN users.last_login_at IS '账号最近一次成功登录时间';
COMMENT ON COLUMN users.last_login_ip IS '账号最近一次成功登录的来源 IP 地址';
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
ALTER TABLE users
    DROP COLUMN last_login_ip,
    DROP COLUMN last_login_at,
    DROP COLUMN rpm_limit,
    DROP COLUMN concurrency_limit,
    DROP COLUMN balance_microusd,
    DROP COLUMN status;
"#,
            )
            .await?;

        Ok(())
    }
}

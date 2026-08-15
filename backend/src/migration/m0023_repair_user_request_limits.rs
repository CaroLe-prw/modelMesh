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
    ADD COLUMN IF NOT EXISTS concurrency_limit BIGINT NOT NULL DEFAULT 100000,
    ADD COLUMN IF NOT EXISTS rpm_limit BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_concurrency_limit_valid'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_concurrency_limit_valid
            CHECK (concurrency_limit BETWEEN 0 AND 4294967295);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_rpm_limit_valid'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_rpm_limit_valid
            CHECK (rpm_limit BETWEEN 0 AND 4294967295);
    END IF;
END
$$;

COMMENT ON COLUMN users.concurrency_limit IS '用户级最大并发请求数；0 表示不限制，在分组未配置时作为兜底';
COMMENT ON COLUMN users.rpm_limit IS '用户级每分钟最大请求数；0 表示不限制，在分组未配置时作为兜底';
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // 这是兼容已经执行过旧版 m0021 的修复迁移。字段也是当前版 m0021 的正式结构，
        // 因此单独回滚本迁移时保留字段，避免破坏新建数据库的用户表。
        Ok(())
    }
}

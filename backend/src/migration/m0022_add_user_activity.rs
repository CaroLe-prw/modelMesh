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
    ADD COLUMN last_active_at TIMESTAMPTZ;

UPDATE users
SET last_active_at = last_login_at
WHERE last_login_at IS NOT NULL;

CREATE INDEX users_last_active_at_idx
    ON users (last_active_at DESC)
    WHERE last_active_at IS NOT NULL;

CREATE INDEX api_keys_user_last_used_at_idx
    ON api_keys (user_id, last_used_at DESC)
    WHERE last_used_at IS NOT NULL;

COMMENT ON COLUMN users.last_active_at IS '账号最近一次通过身份认证访问平台的时间';
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
DROP INDEX api_keys_user_last_used_at_idx;
DROP INDEX users_last_active_at_idx;

ALTER TABLE users
    DROP COLUMN last_active_at;
"#,
            )
            .await?;

        Ok(())
    }
}

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
    ADD COLUMN username VARCHAR(64),
    ADD COLUMN notes TEXT NOT NULL DEFAULT '';

UPDATE users
SET username = LEFT(SPLIT_PART(email, '@', 1), 64)
WHERE username IS NULL OR BTRIM(username) = '';

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL,
    ADD CONSTRAINT users_username_valid
        CHECK (CHAR_LENGTH(BTRIM(username)) BETWEEN 1 AND 64),
    ADD CONSTRAINT users_notes_valid
        CHECK (CHAR_LENGTH(notes) <= 1000);

COMMENT ON COLUMN users.username IS '用户用于后台展示的名称；注册时默认取邮箱前缀';
COMMENT ON COLUMN users.notes IS '管理员维护的用户备注，最多 1000 个字符';
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
    DROP COLUMN notes,
    DROP COLUMN username;
"#,
            )
            .await?;

        Ok(())
    }
}

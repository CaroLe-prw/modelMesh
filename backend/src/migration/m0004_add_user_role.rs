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
    ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'personal',
    ADD CONSTRAINT users_role_valid CHECK (role IN ('personal', 'merchant', 'admin'));

COMMENT ON COLUMN users.role IS '账号最高权限角色：个人、商户或管理员';
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
    DROP COLUMN role;
"#,
            )
            .await?;

        Ok(())
    }
}

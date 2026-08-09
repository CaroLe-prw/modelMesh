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
ALTER TABLE api_keys
    ADD COLUMN last_used_at TIMESTAMPTZ,
    ADD COLUMN last_used_ip INET;

COMMENT ON COLUMN api_keys.last_used_at IS '该 API 密钥最近一次成功调用的时间';
COMMENT ON COLUMN api_keys.last_used_ip IS '该 API 密钥最近一次成功调用的来源 IP 地址';
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
ALTER TABLE api_keys
    DROP COLUMN last_used_ip,
    DROP COLUMN last_used_at;
"#,
            )
            .await?;

        Ok(())
    }
}

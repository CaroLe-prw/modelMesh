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
    DROP COLUMN IF EXISTS business_type;
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // business_type 已从商户申请领域模型中移除，当前版 m0026 也不再创建该字段。
        // 修复迁移只清理旧数据库的遗留结构，回滚时不恢复已经废弃的必填字段。
        Ok(())
    }
}

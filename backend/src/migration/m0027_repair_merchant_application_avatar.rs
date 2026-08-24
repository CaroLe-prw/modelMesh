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
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'merchant_applications_avatar_url_valid'
          AND conrelid = 'merchant_applications'::regclass
    ) THEN
        ALTER TABLE merchant_applications
            ADD CONSTRAINT merchant_applications_avatar_url_valid
            CHECK (avatar_url IS NULL OR CHAR_LENGTH(avatar_url) <= 2796300);
    END IF;
END
$$;

COMMENT ON COLUMN merchant_applications.avatar_url IS '可选的商户头像，保存 HTTP(S) 图片地址或 PNG、JPEG、WebP Base64 Data URL';
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // 这是兼容已经执行过旧版 m0026 的修复迁移。字段也是当前版 m0026 的正式结构，
        // 因此单独回滚本迁移时保留字段，避免破坏新建数据库的商户申请表。
        Ok(())
    }
}

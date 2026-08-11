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
ALTER TABLE brand_presets
    DROP COLUMN search_terms;
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
ALTER TABLE brand_presets
    ADD COLUMN search_terms TEXT NOT NULL DEFAULT '[]',
    ADD CONSTRAINT brand_presets_search_terms_json_array CHECK (
        JSONB_TYPEOF(search_terms::JSONB) = 'array'
    );

COMMENT ON COLUMN brand_presets.search_terms IS '用于按模型名、别名或中文名搜索预设的关键词';
"#,
            )
            .await?;

        Ok(())
    }
}

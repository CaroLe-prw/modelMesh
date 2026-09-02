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
ALTER TABLE models
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT models_sort_order_non_negative CHECK (sort_order >= 0);

COMMENT ON COLUMN models.sort_order IS '模型在所属品牌及模型广场中的显示顺序，数值越小越靠前';

CREATE INDEX models_brand_marketplace_order_idx
    ON models (brand_id, status, sort_order, name, id);
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
DROP INDEX models_brand_marketplace_order_idx;
ALTER TABLE models
    DROP CONSTRAINT models_sort_order_non_negative,
    DROP COLUMN sort_order;
"#,
            )
            .await?;

        Ok(())
    }
}

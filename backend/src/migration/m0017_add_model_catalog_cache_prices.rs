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
ALTER TABLE model_catalog_entries
    ADD COLUMN cache_read_price_nano_usd_per_million BIGINT,
    ADD COLUMN cache_write_price_nano_usd_per_million BIGINT,
    ADD CONSTRAINT model_catalog_entries_cache_read_price_non_negative CHECK (
        cache_read_price_nano_usd_per_million IS NULL
        OR cache_read_price_nano_usd_per_million >= 0
    ),
    ADD CONSTRAINT model_catalog_entries_cache_write_price_non_negative CHECK (
        cache_write_price_nano_usd_per_million IS NULL
        OR cache_write_price_nano_usd_per_million >= 0
    );

COMMENT ON COLUMN model_catalog_entries.cache_read_price_nano_usd_per_million IS '每百万缓存读取 Token 的美元价格，按一亿分之一美元存储，数据源未提供时为空';
COMMENT ON COLUMN model_catalog_entries.cache_write_price_nano_usd_per_million IS '每百万缓存写入 Token 的美元价格，按一亿分之一美元存储，数据源未提供时为空';
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
ALTER TABLE model_catalog_entries
    DROP CONSTRAINT model_catalog_entries_cache_write_price_non_negative,
    DROP CONSTRAINT model_catalog_entries_cache_read_price_non_negative,
    DROP COLUMN cache_write_price_nano_usd_per_million,
    DROP COLUMN cache_read_price_nano_usd_per_million;
"#,
            )
            .await?;

        Ok(())
    }
}

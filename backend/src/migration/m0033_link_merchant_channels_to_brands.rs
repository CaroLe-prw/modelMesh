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
DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'merchant_channels'
          AND column_name = 'provider'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'merchant_channels'
          AND column_name = 'provider_identifier'
    ) THEN
        ALTER TABLE merchant_channels
            ADD COLUMN provider_identifier VARCHAR(64);

        UPDATE merchant_channels AS channel
        SET provider_identifier = (
            SELECT brand.identifier
            FROM brands AS brand
            WHERE brand.identifier = LOWER(BTRIM(channel.provider))
               OR LOWER(BTRIM(brand.name)) = LOWER(BTRIM(channel.provider))
            ORDER BY
                (brand.identifier = LOWER(BTRIM(channel.provider))) DESC,
                (brand.status = 'active') DESC,
                brand.sort_order ASC,
                brand.id ASC
            LIMIT 1
        );

        IF EXISTS (
            SELECT 1
            FROM merchant_channels
            WHERE provider_identifier IS NULL
        ) THEN
            RAISE EXCEPTION
                'merchant channel providers must match an administrator-configured brand before migration';
        END IF;

        ALTER TABLE merchant_channels
            ALTER COLUMN provider_identifier SET NOT NULL,
            ADD CONSTRAINT merchant_channels_provider_identifier_normalized CHECK (
                provider_identifier = LOWER(BTRIM(provider_identifier))
                AND provider_identifier ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
            ),
            ADD CONSTRAINT merchant_channels_provider_identifier_fkey
                FOREIGN KEY (provider_identifier)
                REFERENCES brands(identifier)
                ON UPDATE CASCADE
                ON DELETE RESTRICT;

        COMMENT ON COLUMN merchant_channels.provider_identifier
            IS '渠道关联的管理员供应商品牌标识';

        CREATE INDEX merchant_channels_provider_identifier_idx
            ON merchant_channels (provider_identifier);

        ALTER TABLE merchant_channels DROP COLUMN provider;
    END IF;
END
$migration$;
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
DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'merchant_channels'
          AND column_name = 'provider_identifier'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'merchant_channels'
          AND column_name = 'provider'
    ) THEN
        ALTER TABLE merchant_channels ADD COLUMN provider VARCHAR(80);

        UPDATE merchant_channels AS channel
        SET provider = brand.name
        FROM brands AS brand
        WHERE brand.identifier = channel.provider_identifier;

        ALTER TABLE merchant_channels
            ALTER COLUMN provider SET NOT NULL,
            ADD CONSTRAINT merchant_channels_provider_not_blank CHECK (BTRIM(provider) <> '');

        COMMENT ON COLUMN merchant_channels.provider
            IS '渠道连接的模型供应商或兼容服务名称';

        DROP INDEX IF EXISTS merchant_channels_provider_identifier_idx;
        ALTER TABLE merchant_channels DROP COLUMN provider_identifier;
    END IF;
END
$migration$;
"#,
            )
            .await?;

        Ok(())
    }
}

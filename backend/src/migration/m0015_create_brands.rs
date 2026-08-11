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
CREATE TABLE brands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identifier VARCHAR(64) NOT NULL,
    name VARCHAR(80) NOT NULL,
    preset_id BIGINT REFERENCES brand_presets(id) ON DELETE SET NULL,
    avatar_data_url TEXT,
    sort_order INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brands_identifier_unique UNIQUE (identifier),
    CONSTRAINT brands_preset_unique UNIQUE (preset_id),
    CONSTRAINT brands_identifier_normalized CHECK (
        identifier = LOWER(BTRIM(identifier))
        AND identifier ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
    CONSTRAINT brands_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT brands_avatar_source_exclusive CHECK (
        NOT (preset_id IS NOT NULL AND avatar_data_url IS NOT NULL)
    ),
    CONSTRAINT brands_avatar_data_url_valid CHECK (
        avatar_data_url IS NULL
        OR avatar_data_url LIKE 'data:image/png;base64,%'
        OR avatar_data_url LIKE 'data:image/jpeg;base64,%'
        OR avatar_data_url LIKE 'data:image/webp;base64,%'
    ),
    CONSTRAINT brands_sort_order_non_negative CHECK (sort_order >= 0),
    CONSTRAINT brands_status_valid CHECK (status IN ('active', 'hidden'))
);

COMMENT ON TABLE brands IS '模型广场正式展示和管理的品牌目录';
COMMENT ON COLUMN brands.id IS '数据库自动生成的品牌内部唯一标识';
COMMENT ON COLUMN brands.identifier IS '对外使用且创建后保持稳定的小写品牌标识';
COMMENT ON COLUMN brands.name IS '品牌展示名称';
COMMENT ON COLUMN brands.preset_id IS '内置品牌预设标识，自定义品牌为空';
COMMENT ON COLUMN brands.avatar_data_url IS '自定义品牌头像的数据地址，内置品牌为空并关联预设头像';
COMMENT ON COLUMN brands.sort_order IS '品牌在模型广场中的显示顺序，数值越小越靠前';
COMMENT ON COLUMN brands.status IS '品牌状态：active 表示显示，hidden 表示隐藏';
COMMENT ON COLUMN brands.created_at IS '品牌创建时间';
COMMENT ON COLUMN brands.updated_at IS '品牌最后更新时间';

CREATE INDEX brands_status_sort_order_idx
    ON brands (status, sort_order, id);

INSERT INTO brands (identifier, name, preset_id, sort_order, status)
SELECT
    preset.identifier,
    preset.name,
    preset.id,
    CASE preset.identifier
        WHEN 'openai' THEN 10
        WHEN 'anthropic' THEN 20
        WHEN 'deepseek' THEN 30
        WHEN 'google' THEN 40
        WHEN 'xai' THEN 50
        WHEN 'moonshot' THEN 60
    END,
    'active'
FROM brand_presets AS preset
WHERE preset.identifier IN ('openai', 'anthropic', 'deepseek', 'google', 'xai', 'moonshot')
ON CONFLICT (identifier) DO NOTHING;
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("brands")).to_owned())
            .await
    }
}

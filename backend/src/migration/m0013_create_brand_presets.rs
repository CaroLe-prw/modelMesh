use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use sea_orm_migration::prelude::*;

struct BrandPresetSeed {
    identifier: &'static str,
    name: &'static str,
    subtitle: &'static str,
    search_terms: &'static [&'static str],
    avatar_svg: &'static str,
    sort_order: i32,
}

const BRAND_PRESETS: [BrandPresetSeed; 11] = [
    BrandPresetSeed {
        identifier: "openai",
        name: "OpenAI",
        subtitle: "GPT · ChatGPT",
        search_terms: &["chatgpt", "gpt"],
        avatar_svg: include_str!("../../assets/brand-logos/openai.svg"),
        sort_order: 10,
    },
    BrandPresetSeed {
        identifier: "anthropic",
        name: "Anthropic",
        subtitle: "Claude",
        search_terms: &["claude"],
        avatar_svg: include_str!("../../assets/brand-logos/claude.svg"),
        sort_order: 20,
    },
    BrandPresetSeed {
        identifier: "deepseek",
        name: "DeepSeek",
        subtitle: "DeepSeek",
        search_terms: &["deep seek", "深度求索"],
        avatar_svg: include_str!("../../assets/brand-logos/deepseek.svg"),
        sort_order: 30,
    },
    BrandPresetSeed {
        identifier: "qwen",
        name: "Qwen",
        subtitle: "通义千问",
        search_terms: &["通义千问", "千问", "alibaba"],
        avatar_svg: include_str!("../../assets/brand-logos/qwen.svg"),
        sort_order: 40,
    },
    BrandPresetSeed {
        identifier: "google",
        name: "Google",
        subtitle: "Gemini",
        search_terms: &["gemini", "goofle"],
        avatar_svg: include_str!("../../assets/brand-logos/google.svg"),
        sort_order: 50,
    },
    BrandPresetSeed {
        identifier: "xai",
        name: "xAI",
        subtitle: "Grok",
        search_terms: &["grok"],
        avatar_svg: include_str!("../../assets/brand-logos/xai.svg"),
        sort_order: 60,
    },
    BrandPresetSeed {
        identifier: "kimi",
        name: "Kimi",
        subtitle: "Kimi 智能助手",
        search_terms: &["kimi assistant", "月之暗面 kimi"],
        avatar_svg: include_str!("../../assets/brand-logos/kimi.svg"),
        sort_order: 70,
    },
    BrandPresetSeed {
        identifier: "moonshot",
        name: "Moonshot AI",
        subtitle: "月之暗面",
        search_terms: &["月之暗面", "moonshot"],
        avatar_svg: include_str!("../../assets/brand-logos/moonshot.svg"),
        sort_order: 80,
    },
    BrandPresetSeed {
        identifier: "zhipu",
        name: "Zhipu AI",
        subtitle: "GLM · 智谱",
        search_terms: &["智谱", "glm", "chatglm", "bigmodel"],
        avatar_svg: include_str!("../../assets/brand-logos/zhipu.svg"),
        sort_order: 90,
    },
    BrandPresetSeed {
        identifier: "minimax",
        name: "MiniMax",
        subtitle: "MiniMax",
        search_terms: &["海螺", "hailuo"],
        avatar_svg: include_str!("../../assets/brand-logos/minimax.svg"),
        sort_order: 100,
    },
    BrandPresetSeed {
        identifier: "xiaomi",
        name: "Xiaomi",
        subtitle: "MiMo · 小米",
        search_terms: &["小米", "mimo"],
        avatar_svg: include_str!("../../assets/brand-logos/xiaomi.svg"),
        sort_order: 110,
    },
];

const UPSERT_BRAND_PRESET_SQL: &str = r#"
INSERT INTO brand_presets (
    identifier,
    name,
    subtitle,
    search_terms,
    avatar_svg,
    sort_order
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (identifier) DO UPDATE
SET name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    search_terms = EXCLUDED.search_terms,
    avatar_svg = EXCLUDED.avatar_svg,
    sort_order = EXCLUDED.sort_order,
    enabled = TRUE,
    updated_at = NOW();
"#;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
CREATE TABLE brand_presets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identifier VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    subtitle VARCHAR(120) NOT NULL,
    search_terms TEXT NOT NULL DEFAULT '[]',
    avatar_svg TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_presets_identifier_normalized CHECK (
        identifier = LOWER(BTRIM(identifier))
        AND identifier ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
    CONSTRAINT brand_presets_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT brand_presets_search_terms_json_array CHECK (
        JSONB_TYPEOF(search_terms::JSONB) = 'array'
    ),
    CONSTRAINT brand_presets_avatar_is_svg CHECK (LTRIM(avatar_svg) LIKE '<svg%'),
    CONSTRAINT brand_presets_sort_order_non_negative CHECK (sort_order >= 0)
);

COMMENT ON TABLE brand_presets IS '新增品牌时可直接选用的内置品牌预设';
COMMENT ON COLUMN brand_presets.id IS '数据库自动生成的品牌预设唯一标识';
COMMENT ON COLUMN brand_presets.identifier IS '创建品牌时自动回填的稳定小写标识';
COMMENT ON COLUMN brand_presets.name IS '品牌预设展示名称';
COMMENT ON COLUMN brand_presets.subtitle IS '品牌关联模型或中文名称等辅助说明';
COMMENT ON COLUMN brand_presets.search_terms IS '用于按模型名、别名或中文名搜索预设的关键词';
COMMENT ON COLUMN brand_presets.avatar_svg IS '由后端维护并返回给管理界面的品牌 SVG 头像内容';
COMMENT ON COLUMN brand_presets.sort_order IS '预设在品牌选择器中的显示顺序';
COMMENT ON COLUMN brand_presets.enabled IS '该预设当前是否允许在新增品牌时选择';
COMMENT ON COLUMN brand_presets.created_at IS '品牌预设创建时间';
COMMENT ON COLUMN brand_presets.updated_at IS '品牌预设最后更新时间';

CREATE INDEX brand_presets_enabled_sort_order_idx
    ON brand_presets (enabled, sort_order, id);
"#,
            )
            .await?;

        for preset in BRAND_PRESETS {
            let search_terms = serde_json::to_string(preset.search_terms)
                .map_err(|error| DbErr::Custom(error.to_string()))?;
            manager
                .get_connection()
                .execute_raw(Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    UPSERT_BRAND_PRESET_SQL,
                    [
                        preset.identifier.into(),
                        preset.name.into(),
                        preset.subtitle.into(),
                        search_terms.into(),
                        preset.avatar_svg.into(),
                        preset.sort_order.into(),
                    ],
                ))
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("brand_presets")).to_owned())
            .await
    }
}

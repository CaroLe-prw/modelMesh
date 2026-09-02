use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "models")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub brand_id: i64,
    pub identifier: String,
    pub name: String,
    pub catalog_source: Option<String>,
    pub catalog_provider_id: Option<String>,
    pub catalog_model_id: Option<String>,
    pub context_window: i64,
    pub billing_mode: String,
    pub input_price_nano_usd_per_million: i64,
    pub input_price_overridden: bool,
    pub cache_read_price_nano_usd_per_million: i64,
    pub cache_read_price_overridden: bool,
    pub cache_write_price_nano_usd_per_million: i64,
    pub cache_write_price_overridden: bool,
    pub output_price_nano_usd_per_million: i64,
    pub output_price_overridden: bool,
    pub default_pricing_nano_usd: Json,
    pub pricing_overrides_nano_usd: Json,
    pub sort_order: i32,
    pub status: String,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::brand::Entity",
        from = "Column::BrandId",
        to = "super::brand::Column::Id",
        on_update = "NoAction",
        on_delete = "Restrict"
    )]
    Brand,
}

impl Related<super::brand::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Brand.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

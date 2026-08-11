use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "model_catalog_entries")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub source: String,
    #[sea_orm(primary_key, auto_increment = false)]
    pub provider_id: String,
    #[sea_orm(primary_key, auto_increment = false)]
    pub model_id: String,
    pub model_name: String,
    pub context_window: Option<i64>,
    pub cache_read_price_nano_usd_per_million: Option<i64>,
    pub cache_write_price_nano_usd_per_million: Option<i64>,
    pub input_price_nano_usd_per_million: Option<i64>,
    pub output_price_nano_usd_per_million: Option<i64>,
    pub pricing_nano_usd: Json,
    pub source_data: Json,
    pub source_synced_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

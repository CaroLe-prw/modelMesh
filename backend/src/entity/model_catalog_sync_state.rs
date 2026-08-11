use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "model_catalog_sync_state")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub source: String,
    pub last_synced_at: TimeDateTimeWithTimeZone,
    pub entry_count: i64,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

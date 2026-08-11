use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "brand_presets")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub identifier: String,
    pub name: String,
    pub subtitle: String,
    pub models_dev_provider_id: Option<String>,
    pub avatar_svg: String,
    pub sort_order: i32,
    pub enabled: bool,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

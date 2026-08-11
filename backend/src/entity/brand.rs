use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "brands")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub identifier: String,
    pub name: String,
    pub preset_id: Option<i64>,
    pub avatar_data_url: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::brand_preset::Entity",
        from = "Column::PresetId",
        to = "super::brand_preset::Column::Id",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    BrandPreset,
}

impl Related<super::brand_preset::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BrandPreset.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

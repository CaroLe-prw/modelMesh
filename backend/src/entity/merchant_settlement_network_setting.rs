use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "merchant_settlement_network_settings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub network: String,
    pub is_enabled: bool,
    pub sort_order: i16,
    pub updated_by: Option<i64>,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UpdatedBy",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    UpdatedBy,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::UpdatedBy.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

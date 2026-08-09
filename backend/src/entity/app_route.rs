use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "app_routes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub route_key: String,
    pub path: String,
    pub label_key: String,
    pub icon_key: String,
    pub group_key: String,
    pub sort_order: i32,
    pub enabled: bool,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::app_route_role::Entity")]
    Roles,
}

impl Related<super::app_route_role::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Roles.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

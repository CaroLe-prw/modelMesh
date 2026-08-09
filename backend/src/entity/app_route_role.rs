use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "app_route_roles")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub route_id: i64,
    #[sea_orm(primary_key, auto_increment = false)]
    pub role: String,
    pub created_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::app_route::Entity",
        from = "Column::RouteId",
        to = "super::app_route::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    AppRoute,
}

impl Related<super::app_route::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AppRoute.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

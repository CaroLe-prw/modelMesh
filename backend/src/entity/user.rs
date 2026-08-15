use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub email: String,
    pub password_hash: String,
    pub username: String,
    pub notes: String,
    pub role: String,
    pub status: String,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
    pub last_login_at: Option<TimeDateTimeWithTimeZone>,
    pub last_login_ip: Option<IpNetwork>,
    pub last_active_at: Option<TimeDateTimeWithTimeZone>,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::api_key::Entity")]
    ApiKeys,
}

impl Related<super::api_key::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ApiKeys.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

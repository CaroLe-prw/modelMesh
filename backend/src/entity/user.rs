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
    pub merchant_status: String,
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
    #[sea_orm(has_many = "super::merchant_channel::Entity")]
    MerchantChannels,
    #[sea_orm(has_one = "super::merchant_application::Entity")]
    MerchantApplication,
}

impl Related<super::api_key::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ApiKeys.def()
    }
}

impl Related<super::merchant_channel::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MerchantChannels.def()
    }
}

impl Related<super::merchant_application::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MerchantApplication.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

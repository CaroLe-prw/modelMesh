use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_keys")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: i64,
    pub name: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub key_suffix: String,
    pub status: String,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_microusd: i64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_microusd: i64,
    pub daily_limit_microusd: i64,
    pub weekly_limit_microusd: i64,
    pub expires_at: Option<TimeDateTimeWithTimeZone>,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
    pub last_used_at: Option<TimeDateTimeWithTimeZone>,
    pub last_used_ip: Option<IpNetwork>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

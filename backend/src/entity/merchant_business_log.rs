use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "merchant_business_logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub merchant_user_id: i64,
    pub origin: String,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub request_type: String,
    pub subject: String,
    pub description: String,
    pub action: Option<String>,
    pub status: String,
    pub review_note: String,
    pub submitted_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::MerchantUserId",
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

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "merchant_channels")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub public_id: i64,
    pub merchant_user_id: i64,
    pub name: String,
    pub provider_identifier: String,
    pub base_url: String,
    pub api_key_ciphertext: String,
    pub description: String,
    pub available_models: Json,
    pub supported_models: Json,
    pub status: String,
    pub review_action: String,
    pub review_note: String,
    pub review_submitted_at: TimeDateTimeWithTimeZone,
    pub model_count: i64,
    pub success_rate_basis_points: i32,
    pub average_latency_ms: i64,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::brand::Entity",
        from = "Column::ProviderIdentifier",
        to = "super::brand::Column::Identifier",
        on_update = "Cascade",
        on_delete = "Restrict"
    )]
    Brand,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::MerchantUserId",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    User,
}

impl Related<super::brand::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Brand.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

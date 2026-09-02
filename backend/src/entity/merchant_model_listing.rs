use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "merchant_model_listings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub merchant_user_id: i64,
    pub channel_id: Uuid,
    pub model_id: i64,
    pub context_window: i64,
    pub billing_mode: String,
    pub price_currency: String,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing_nano: Json,
    pub status: String,
    pub review_status: String,
    pub review_action: String,
    pub review_note: String,
    pub review_submitted_at: TimeDateTimeWithTimeZone,
    pub has_approved_price: bool,
    pub pending_billing_mode: Option<String>,
    pub pending_price_currency: Option<String>,
    pub pending_input_price_nano_per_million: Option<i64>,
    pub pending_output_price_nano_per_million: Option<i64>,
    pub pending_pricing_nano: Option<Json>,
    pub price_effective_at: Option<TimeDateTimeWithTimeZone>,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::merchant_channel::Entity",
        from = "Column::ChannelId",
        to = "super::merchant_channel::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    MerchantChannel,
    #[sea_orm(
        belongs_to = "super::model::Entity",
        from = "Column::ModelId",
        to = "super::model::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Model,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::MerchantUserId",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    User,
}

impl Related<super::merchant_channel::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MerchantChannel.def()
    }
}

impl Related<super::model::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Model.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

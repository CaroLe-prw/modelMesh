use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "merchant_withdrawals")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub merchant_user_id: i64,
    pub settlement_account_id: Option<Uuid>,
    pub entity_name: String,
    pub method: String,
    pub currency: String,
    pub network: Option<String>,
    pub account_ciphertext: String,
    pub account_encryption_context: String,
    pub account_masked: String,
    pub amount_microusd: i64,
    pub fee_microusd: i64,
    pub net_amount_microusd: i64,
    pub balance_after_microusd: i64,
    pub status: String,
    pub review_note: String,
    pub reviewed_by: Option<i64>,
    pub reviewed_at: Option<TimeDateTimeWithTimeZone>,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::MerchantUserId",
        to = "super::user::Column::Id",
        on_update = "NoAction",
        on_delete = "Restrict"
    )]
    Merchant,
    #[sea_orm(
        belongs_to = "super::merchant_settlement_account::Entity",
        from = "Column::SettlementAccountId",
        to = "super::merchant_settlement_account::Column::Id",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    SettlementAccount,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Merchant.def()
    }
}

impl Related<super::merchant_settlement_account::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SettlementAccount.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "system_settings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: i16,
    pub registration_enabled: bool,
    pub withdrawal_minimum_microusd: i64,
    pub withdrawal_fee_bps: i32,
    pub platform_fee_bps: i32,
    pub bank_enabled: bool,
    pub alipay_enabled: bool,
    pub usdt_enabled: bool,
    pub trc20_enabled: bool,
    pub erc20_enabled: bool,
    pub bep20_enabled: bool,
    pub polygon_enabled: bool,
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

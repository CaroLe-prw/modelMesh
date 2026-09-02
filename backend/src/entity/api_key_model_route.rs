use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_key_model_routes")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub api_key_id: Uuid,
    pub model_id: i64,
    #[sea_orm(primary_key, auto_increment = false)]
    pub merchant_model_listing_id: Uuid,
    pub is_pinned: bool,
    pub created_at: TimeDateTimeWithTimeZone,
    pub updated_at: TimeDateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::api_key::Entity",
        from = "Column::ApiKeyId",
        to = "super::api_key::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    ApiKey,
    #[sea_orm(
        belongs_to = "super::merchant_model_listing::Entity",
        from = "Column::MerchantModelListingId",
        to = "super::merchant_model_listing::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    MerchantModelListing,
    #[sea_orm(
        belongs_to = "super::model::Entity",
        from = "Column::ModelId",
        to = "super::model::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Model,
}

impl Related<super::api_key::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ApiKey.def()
    }
}

impl Related<super::merchant_model_listing::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MerchantModelListing.def()
    }
}

impl Related<super::model::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Model.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

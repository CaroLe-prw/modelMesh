use std::collections::HashMap;

use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, QueryOrder,
    Set, TransactionTrait, sea_query::Expr,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        MerchantBillingMode, MerchantChannelStatus, MerchantModel, MerchantModelPendingPrice,
        MerchantModelReviewStatus, MerchantModelStatus, MerchantOperationAudit,
        MerchantPriceCurrency, ModelPricing, UserId,
    },
    entity::{merchant_channel, merchant_model_listing, model},
};

use super::{
    RepositoryConflict, RepositoryError, database_constraint, set_merchant_operation_context,
};

#[derive(Clone)]
pub struct MerchantModelRepository {
    database: DatabaseConnection,
}

pub struct NewMerchantModelRecord {
    pub id: String,
    pub merchant_user_id: UserId,
    pub channel_id: String,
    pub model_id: i64,
    pub context_window: i64,
    pub billing_mode: MerchantBillingMode,
    pub price_currency: MerchantPriceCurrency,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing_nano: ModelPricing,
}

pub struct UpdateMerchantModelRecord {
    pub channel_id: String,
    pub model_id: i64,
    pub context_window: i64,
    pub billing_mode: MerchantBillingMode,
    pub price_currency: MerchantPriceCurrency,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing_nano: ModelPricing,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantModelPriceMutation {
    ApplyImmediately,
    ReplaceInitialSubmission,
    SubmitForReview,
}

impl MerchantModelRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_by_user(
        &self,
        user_id: UserId,
    ) -> Result<Vec<MerchantModel>, RepositoryError> {
        self.apply_due_price_updates(Some(user_id)).await?;
        let listings = merchant_model_list_query(user_id)
            .all(&self.database)
            .await?;
        self.hydrate(listings, user_id).await
    }

    pub async fn find_by_user_and_id(
        &self,
        user_id: UserId,
        listing_id: &str,
    ) -> Result<Option<MerchantModel>, RepositoryError> {
        self.apply_due_price_updates(Some(user_id)).await?;
        let listing_id = Uuid::parse_str(listing_id).map_err(invalid_data)?;
        let listing = merchant_model_listing::Entity::find_by_id(listing_id)
            .filter(merchant_model_listing::Column::MerchantUserId.eq(user_id))
            .one(&self.database)
            .await?;
        let Some(listing) = listing else {
            return Ok(None);
        };

        Ok(self.hydrate(vec![listing], user_id).await?.pop())
    }

    pub async fn create(
        &self,
        record: NewMerchantModelRecord,
    ) -> Result<MerchantModel, RepositoryError> {
        let pricing_nano = pricing_to_json(record.pricing_nano)?;
        let listing = merchant_model_listing::ActiveModel {
            id: Set(Uuid::parse_str(&record.id).map_err(invalid_data)?),
            merchant_user_id: Set(record.merchant_user_id),
            channel_id: Set(Uuid::parse_str(&record.channel_id).map_err(invalid_data)?),
            model_id: Set(record.model_id),
            context_window: Set(record.context_window),
            billing_mode: Set(record.billing_mode.as_str().to_owned()),
            price_currency: Set(record.price_currency.as_str().to_owned()),
            input_price_nano_per_million: Set(record.input_price_nano_per_million),
            output_price_nano_per_million: Set(record.output_price_nano_per_million),
            pricing_nano: Set(pricing_nano),
            status: Set(MerchantModelStatus::Offline.as_str().to_owned()),
            review_status: Set(MerchantModelReviewStatus::Pending.as_str().to_owned()),
            review_action: Set("publish".to_owned()),
            has_approved_price: Set(false),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_merchant_model_write_error)?;

        self.hydrate(vec![listing], record.merchant_user_id)
            .await?
            .pop()
            .ok_or_else(|| {
                RepositoryError::InvalidData("created model listing was not found".to_owned())
            })
    }

    pub async fn update(
        &self,
        user_id: UserId,
        listing_id: &str,
        record: UpdateMerchantModelRecord,
        mutation: MerchantModelPriceMutation,
    ) -> Result<Option<MerchantModel>, RepositoryError> {
        let listing_id = Uuid::parse_str(listing_id).map_err(invalid_data)?;
        let channel_id = Uuid::parse_str(&record.channel_id).map_err(invalid_data)?;
        let pricing_nano = pricing_to_json(record.pricing_nano)?;
        let mut update = merchant_model_listing::ActiveModel {
            channel_id: Set(channel_id),
            model_id: Set(record.model_id),
            context_window: Set(record.context_window),
            review_action: Set("price_change".to_owned()),
            review_note: Set(String::new()),
            ..Default::default()
        };
        match mutation {
            MerchantModelPriceMutation::ApplyImmediately => {
                update.billing_mode = Set(record.billing_mode.as_str().to_owned());
                update.price_currency = Set(record.price_currency.as_str().to_owned());
                update.input_price_nano_per_million = Set(record.input_price_nano_per_million);
                update.output_price_nano_per_million = Set(record.output_price_nano_per_million);
                update.pricing_nano = Set(pricing_nano);
                update.review_status = Set(MerchantModelReviewStatus::Approved.as_str().to_owned());
                update.pending_price_currency = Set(None);
                update.pending_billing_mode = Set(None);
                update.pending_input_price_nano_per_million = Set(None);
                update.pending_output_price_nano_per_million = Set(None);
                update.pending_pricing_nano = Set(None);
                update.price_effective_at = Set(None);
            }
            MerchantModelPriceMutation::ReplaceInitialSubmission => {
                update.billing_mode = Set(record.billing_mode.as_str().to_owned());
                update.price_currency = Set(record.price_currency.as_str().to_owned());
                update.input_price_nano_per_million = Set(record.input_price_nano_per_million);
                update.output_price_nano_per_million = Set(record.output_price_nano_per_million);
                update.pricing_nano = Set(pricing_nano);
                update.review_status = Set(MerchantModelReviewStatus::Pending.as_str().to_owned());
                update.pending_price_currency = Set(None);
                update.pending_billing_mode = Set(None);
                update.pending_input_price_nano_per_million = Set(None);
                update.pending_output_price_nano_per_million = Set(None);
                update.pending_pricing_nano = Set(None);
                update.price_effective_at = Set(None);
            }
            MerchantModelPriceMutation::SubmitForReview => {
                update.review_status = Set(MerchantModelReviewStatus::Pending.as_str().to_owned());
                update.pending_price_currency =
                    Set(Some(record.price_currency.as_str().to_owned()));
                update.pending_billing_mode = Set(Some(record.billing_mode.as_str().to_owned()));
                update.pending_input_price_nano_per_million =
                    Set(Some(record.input_price_nano_per_million));
                update.pending_output_price_nano_per_million =
                    Set(Some(record.output_price_nano_per_million));
                update.pending_pricing_nano = Set(Some(pricing_nano));
                update.price_effective_at = Set(None);
            }
        }
        let updated = merchant_model_listing::Entity::update_many()
            .set(update)
            .col_expr(
                merchant_model_listing::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .col_expr(
                merchant_model_listing::Column::ReviewSubmittedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_model_listing::Column::MerchantUserId.eq(user_id))
            .filter(merchant_model_listing::Column::Id.eq(listing_id))
            .exec_with_returning(&self.database)
            .await
            .map_err(map_merchant_model_write_error)?
            .into_iter()
            .next();

        let Some(updated) = updated else {
            return Ok(None);
        };
        Ok(self.hydrate(vec![updated], user_id).await?.pop())
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        listing_id: &str,
        status: MerchantModelStatus,
        audit: &MerchantOperationAudit,
    ) -> Result<Option<MerchantModel>, RepositoryError> {
        let listing_id = Uuid::parse_str(listing_id).map_err(invalid_data)?;
        let transaction = self.database.begin().await?;
        set_merchant_operation_context(&transaction, audit).await?;
        let updated = merchant_model_status_update(user_id, listing_id, status)
            .exec_with_returning(&transaction)
            .await?
            .into_iter()
            .next();
        transaction.commit().await?;

        let Some(updated) = updated else {
            return Ok(None);
        };
        Ok(self.hydrate(vec![updated], user_id).await?.pop())
    }

    pub async fn delete(&self, user_id: UserId, listing_id: &str) -> Result<bool, RepositoryError> {
        let listing_id = Uuid::parse_str(listing_id).map_err(invalid_data)?;
        let result = merchant_model_listing::Entity::delete_many()
            .filter(merchant_model_listing::Column::MerchantUserId.eq(user_id))
            .filter(merchant_model_listing::Column::Id.eq(listing_id))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected == 1)
    }

    pub async fn apply_due_price_updates(
        &self,
        user_id: Option<UserId>,
    ) -> Result<u64, RepositoryError> {
        let mut update = merchant_model_listing::Entity::update_many()
            .col_expr(
                merchant_model_listing::Column::BillingMode,
                Expr::col(merchant_model_listing::Column::PendingBillingMode),
            )
            .col_expr(
                merchant_model_listing::Column::PriceCurrency,
                Expr::col(merchant_model_listing::Column::PendingPriceCurrency),
            )
            .col_expr(
                merchant_model_listing::Column::InputPriceNanoPerMillion,
                Expr::col(merchant_model_listing::Column::PendingInputPriceNanoPerMillion),
            )
            .col_expr(
                merchant_model_listing::Column::OutputPriceNanoPerMillion,
                Expr::col(merchant_model_listing::Column::PendingOutputPriceNanoPerMillion),
            )
            .col_expr(
                merchant_model_listing::Column::PricingNano,
                Expr::col(merchant_model_listing::Column::PendingPricingNano),
            )
            .set(merchant_model_listing::ActiveModel {
                pending_billing_mode: Set(None),
                pending_price_currency: Set(None),
                pending_input_price_nano_per_million: Set(None),
                pending_output_price_nano_per_million: Set(None),
                pending_pricing_nano: Set(None),
                price_effective_at: Set(None),
                ..Default::default()
            })
            .col_expr(
                merchant_model_listing::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_model_listing::Column::PriceEffectiveAt.lte(OffsetDateTime::now_utc()))
            .filter(merchant_model_listing::Column::PendingPricingNano.is_not_null());
        update = update.filter(merchant_model_listing::Column::ReviewStatus.eq("approved"));
        if let Some(user_id) = user_id {
            update = update.filter(merchant_model_listing::Column::MerchantUserId.eq(user_id));
        }

        Ok(update.exec(&self.database).await?.rows_affected)
    }

    async fn hydrate(
        &self,
        listings: Vec<merchant_model_listing::Model>,
        user_id: UserId,
    ) -> Result<Vec<MerchantModel>, RepositoryError> {
        if listings.is_empty() {
            return Ok(Vec::new());
        }
        let channel_ids = listings
            .iter()
            .map(|listing| listing.channel_id)
            .collect::<Vec<_>>();
        let model_ids = listings
            .iter()
            .map(|listing| listing.model_id)
            .collect::<Vec<_>>();
        let channels = merchant_channel::Entity::find()
            .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
            .filter(merchant_channel::Column::Id.is_in(channel_ids))
            .all(&self.database)
            .await?
            .into_iter()
            .map(|channel| (channel.id, channel))
            .collect::<HashMap<_, _>>();
        let models = model::Entity::find()
            .filter(model::Column::Id.is_in(model_ids))
            .all(&self.database)
            .await?
            .into_iter()
            .map(|model| (model.id, model))
            .collect::<HashMap<_, _>>();

        listings
            .into_iter()
            .map(|listing| merchant_model_from_models(listing, &channels, &models))
            .collect()
    }
}

fn merchant_model_list_query(user_id: UserId) -> sea_orm::Select<merchant_model_listing::Entity> {
    merchant_model_listing::Entity::find()
        .filter(merchant_model_listing::Column::MerchantUserId.eq(user_id))
        .order_by_desc(merchant_model_listing::Column::UpdatedAt)
        .order_by_desc(merchant_model_listing::Column::Id)
}

fn merchant_model_status_update(
    user_id: UserId,
    listing_id: Uuid,
    status: MerchantModelStatus,
) -> sea_orm::UpdateMany<merchant_model_listing::Entity> {
    merchant_model_listing::Entity::update_many()
        .set(merchant_model_listing::ActiveModel {
            status: Set(status.as_str().to_owned()),
            ..Default::default()
        })
        .col_expr(
            merchant_model_listing::Column::UpdatedAt,
            Expr::current_timestamp(),
        )
        .filter(merchant_model_listing::Column::MerchantUserId.eq(user_id))
        .filter(merchant_model_listing::Column::Id.eq(listing_id))
}

fn merchant_model_from_models(
    listing: merchant_model_listing::Model,
    channels: &HashMap<Uuid, merchant_channel::Model>,
    models: &HashMap<i64, model::Model>,
) -> Result<MerchantModel, RepositoryError> {
    let channel = channels.get(&listing.channel_id).ok_or_else(|| {
        RepositoryError::InvalidData(format!(
            "model listing references missing channel: {}",
            listing.channel_id
        ))
    })?;
    let model = models.get(&listing.model_id).ok_or_else(|| {
        RepositoryError::InvalidData(format!(
            "model listing references missing model: {}",
            listing.model_id
        ))
    })?;
    let status = merchant_model_status(&listing.status)?;
    let channel_status = merchant_channel_status(&channel.status)?;
    let billing_mode = MerchantBillingMode::parse(&listing.billing_mode).ok_or_else(|| {
        RepositoryError::InvalidData(format!(
            "invalid merchant model billing mode: {}",
            listing.billing_mode
        ))
    })?;
    let review_status = merchant_model_review_status(&listing.review_status)?;
    let listing_pricing = pricing_from_json(listing.pricing_nano.clone())?;
    let price_currency =
        MerchantPriceCurrency::parse(&listing.price_currency).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "invalid merchant model price currency: {}",
                listing.price_currency
            ))
        })?;
    let pending_price = pending_price_from_model(&listing)?;

    Ok(MerchantModel {
        id: listing.id.hyphenated().to_string(),
        channel_id: listing.channel_id.hyphenated().to_string(),
        channel_name: channel.name.clone(),
        channel_status,
        provider_id: channel.provider_identifier.clone(),
        model_id: model.id,
        model_identifier: model.identifier.clone(),
        model_name: model.name.clone(),
        context_window: listing.context_window,
        billing_mode,
        price_currency,
        input_price_nano_per_million: listing.input_price_nano_per_million,
        output_price_nano_per_million: listing.output_price_nano_per_million,
        pricing: listing_pricing,
        status,
        review_status,
        has_approved_price: listing.has_approved_price,
        pending_price,
        review_note: listing.review_note,
        created_at: domain_timestamp(listing.created_at)?,
        updated_at: domain_timestamp(listing.updated_at)?,
    })
}

fn merchant_model_status(value: &str) -> Result<MerchantModelStatus, RepositoryError> {
    match value {
        "offline" => Ok(MerchantModelStatus::Offline),
        "published" => Ok(MerchantModelStatus::Published),
        value => Err(RepositoryError::InvalidData(format!(
            "invalid merchant model status: {value}"
        ))),
    }
}

fn merchant_channel_status(value: &str) -> Result<MerchantChannelStatus, RepositoryError> {
    match value {
        "active" => Ok(MerchantChannelStatus::Active),
        "offline" => Ok(MerchantChannelStatus::Offline),
        "pending" => Ok(MerchantChannelStatus::Pending),
        "rejected" => Ok(MerchantChannelStatus::Rejected),
        value => Err(RepositoryError::InvalidData(format!(
            "invalid merchant model channel status: {value}"
        ))),
    }
}

fn merchant_model_review_status(value: &str) -> Result<MerchantModelReviewStatus, RepositoryError> {
    match value {
        "pending" => Ok(MerchantModelReviewStatus::Pending),
        "approved" => Ok(MerchantModelReviewStatus::Approved),
        "rejected" => Ok(MerchantModelReviewStatus::Rejected),
        value => Err(RepositoryError::InvalidData(format!(
            "invalid merchant model review status: {value}"
        ))),
    }
}

fn pending_price_from_model(
    listing: &merchant_model_listing::Model,
) -> Result<Option<MerchantModelPendingPrice>, RepositoryError> {
    let values = (
        listing.pending_billing_mode.as_deref(),
        listing.pending_price_currency.as_deref(),
        listing.pending_input_price_nano_per_million,
        listing.pending_output_price_nano_per_million,
        listing.pending_pricing_nano.as_ref(),
    );
    match values {
        (None, None, None, None, None) => Ok(None),
        (Some(billing_mode), Some(currency), Some(input), Some(output), Some(pricing)) => {
            let billing_mode = MerchantBillingMode::parse(billing_mode).ok_or_else(|| {
                RepositoryError::InvalidData(format!(
                    "invalid pending merchant model billing mode: {billing_mode}"
                ))
            })?;
            let price_currency = MerchantPriceCurrency::parse(currency).ok_or_else(|| {
                RepositoryError::InvalidData(format!(
                    "invalid pending merchant model price currency: {currency}"
                ))
            })?;
            let pricing = pricing_from_json(pricing.clone())?;
            Ok(Some(MerchantModelPendingPrice {
                billing_mode,
                price_currency,
                input_price_nano_per_million: input,
                output_price_nano_per_million: output,
                pricing,
                effective_at: listing
                    .price_effective_at
                    .map(domain_timestamp)
                    .transpose()?,
            }))
        }
        _ => Err(RepositoryError::InvalidData(
            "merchant model pending price fields are incomplete".to_owned(),
        )),
    }
}

fn map_merchant_model_write_error(error: DbErr) -> RepositoryError {
    match database_constraint(&error) {
        Some("merchant_model_listings_channel_model_unique") => {
            RepositoryError::Conflict(RepositoryConflict::MerchantModelListing)
        }
        _ => RepositoryError::Database(error),
    }
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

fn pricing_from_json(value: serde_json::Value) -> Result<ModelPricing, RepositoryError> {
    serde_json::from_value(value).map_err(invalid_data)
}

fn pricing_to_json(pricing: ModelPricing) -> Result<serde_json::Value, RepositoryError> {
    serde_json::to_value(pricing).map_err(invalid_data)
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32).map_err(invalid_data)
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_model.rs"]
mod tests;

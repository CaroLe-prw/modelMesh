use jiff::Timestamp;
use sea_orm::{
    ColumnTrait, Condition, DatabaseConnection, EntityTrait, FromQueryResult, JoinType,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select, Set,
    sea_query::{Expr, ExprTrait, LikeExpr, extension::postgres::PgExpr},
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        CatalogReview, CatalogReviewAction, CatalogReviewDecision, CatalogReviewKind,
        CatalogReviewStatus, MerchantChannelStatus, Page, Pagination,
    },
    entity::{
        brand, merchant_channel, merchant_model_listing, model, model_price_review_settings, user,
    },
};

use super::{MerchantModelRepository, RepositoryError};

#[derive(Clone)]
pub struct CatalogReviewRepository {
    database: DatabaseConnection,
}

pub struct CatalogReviewSearch {
    pub exact_channel_id: Option<i64>,
    pub exact_id: Option<Uuid>,
    pub pattern: Option<String>,
    pub status: Option<CatalogReviewStatus>,
}

#[derive(Debug, FromQueryResult)]
pub struct CatalogReviewChannelConnection {
    pub api_key_ciphertext: String,
    pub base_url: String,
    pub id: Uuid,
    pub provider_id: String,
}

#[derive(Debug, FromQueryResult)]
pub struct CatalogReviewModelConnection {
    pub api_key_ciphertext: String,
    pub base_url: String,
    pub channel_id: Uuid,
    pub model_identifier: String,
    pub provider_id: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewResult {
    Reviewed,
    NotFound,
    InvalidState,
}

#[derive(Debug, FromQueryResult)]
struct ChannelReviewRow {
    id: Uuid,
    channel_id: i64,
    action: String,
    name: String,
    merchant_username: String,
    merchant_email: String,
    provider_id: String,
    provider: String,
    review_note: String,
    status: String,
    submitted_at: OffsetDateTime,
    total_count: i64,
}

#[derive(Debug, FromQueryResult)]
struct ModelReviewRow {
    id: Uuid,
    channel_id: i64,
    action: String,
    name: String,
    model_identifier: String,
    merchant_username: String,
    merchant_email: String,
    provider_id: String,
    provider: String,
    context_window: i64,
    current_output_price_nano_per_million: i64,
    proposed_output_price_nano_per_million: Option<i64>,
    price_effective_at: Option<OffsetDateTime>,
    review_note: String,
    status: String,
    submitted_at: OffsetDateTime,
    total_count: i64,
}

impl CatalogReviewRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(
        &self,
        kind: CatalogReviewKind,
        search: &CatalogReviewSearch,
        pagination: Pagination,
    ) -> Result<Page<CatalogReview>, RepositoryError> {
        match kind {
            CatalogReviewKind::Channel => self.list_channels(search, pagination).await,
            CatalogReviewKind::Model => self.list_models(search, pagination).await,
        }
    }

    pub async fn review(
        &self,
        kind: CatalogReviewKind,
        review_id: Uuid,
        expected_status: CatalogReviewStatus,
        decision: CatalogReviewDecision,
        review_note: String,
    ) -> Result<CatalogReviewResult, RepositoryError> {
        match kind {
            CatalogReviewKind::Channel => {
                self.review_channel(review_id, expected_status, decision, review_note)
                    .await
            }
            CatalogReviewKind::Model => {
                self.review_model(review_id, expected_status, decision, review_note)
                    .await
            }
        }
    }

    pub async fn find_channel_connection(
        &self,
        review_id: Uuid,
    ) -> Result<Option<CatalogReviewChannelConnection>, RepositoryError> {
        channel_connection_query(review_id)
            .into_model::<CatalogReviewChannelConnection>()
            .one(&self.database)
            .await
            .map_err(Into::into)
    }

    pub async fn find_model_connection(
        &self,
        review_id: Uuid,
    ) -> Result<Option<CatalogReviewModelConnection>, RepositoryError> {
        model_connection_query(review_id)
            .into_model::<CatalogReviewModelConnection>()
            .one(&self.database)
            .await
            .map_err(Into::into)
    }

    async fn list_channels(
        &self,
        search: &CatalogReviewSearch,
        pagination: Pagination,
    ) -> Result<Page<CatalogReview>, RepositoryError> {
        let rows = channel_review_list_query(search)
            .limit(u64::from(pagination.page_size()))
            .offset(u64::from(pagination.page_index()) * u64::from(pagination.page_size()))
            .into_model::<ChannelReviewRow>()
            .all(&self.database)
            .await?;
        let total = match rows.first() {
            Some(row) => u64::try_from(row.total_count).map_err(invalid_data)?,
            None if pagination.page_index() > 0 => {
                channel_review_filtered_query(search)
                    .count(&self.database)
                    .await?
            }
            None => 0,
        };
        let items = rows
            .into_iter()
            .map(channel_review_from_row)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    async fn list_models(
        &self,
        search: &CatalogReviewSearch,
        pagination: Pagination,
    ) -> Result<Page<CatalogReview>, RepositoryError> {
        MerchantModelRepository::new(self.database.clone())
            .apply_due_price_updates(None)
            .await?;
        let rows = model_review_list_query(search)
            .limit(u64::from(pagination.page_size()))
            .offset(u64::from(pagination.page_index()) * u64::from(pagination.page_size()))
            .into_model::<ModelReviewRow>()
            .all(&self.database)
            .await?;
        let total = match rows.first() {
            Some(row) => u64::try_from(row.total_count).map_err(invalid_data)?,
            None if pagination.page_index() > 0 => {
                model_review_filtered_query(search)
                    .count(&self.database)
                    .await?
            }
            None => 0,
        };
        let items = rows
            .into_iter()
            .map(model_review_from_row)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    async fn review_channel(
        &self,
        review_id: Uuid,
        expected_status: CatalogReviewStatus,
        decision: CatalogReviewDecision,
        review_note: String,
    ) -> Result<CatalogReviewResult, RepositoryError> {
        let mut update = merchant_channel::ActiveModel {
            review_note: Set(review_note),
            ..Default::default()
        };
        if let Some(status) = channel_review_update_status(expected_status, decision) {
            update.status = Set(status.as_str().to_owned());
        }
        let result = merchant_channel::Entity::update_many()
            .set(update)
            .col_expr(
                merchant_channel::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_channel::Column::Id.eq(review_id))
            .filter(channel_expected_status_condition(expected_status))
            .exec(&self.database)
            .await?;

        if result.rows_affected == 1 {
            return Ok(CatalogReviewResult::Reviewed);
        }

        review_result_for_existence(
            merchant_channel::Entity::find_by_id(review_id)
                .one(&self.database)
                .await?
                .is_some(),
        )
    }

    async fn review_model(
        &self,
        review_id: Uuid,
        expected_status: CatalogReviewStatus,
        decision: CatalogReviewDecision,
        review_note: String,
    ) -> Result<CatalogReviewResult, RepositoryError> {
        MerchantModelRepository::new(self.database.clone())
            .apply_due_price_updates(None)
            .await?;
        let Some(listing) = merchant_model_listing::Entity::find_by_id(review_id)
            .one(&self.database)
            .await?
        else {
            return Ok(CatalogReviewResult::NotFound);
        };
        let mut update = merchant_model_listing::ActiveModel {
            review_note: Set(review_note),
            review_status: Set(match decision {
                CatalogReviewDecision::Approve => "approved".to_owned(),
                CatalogReviewDecision::Reject => "rejected".to_owned(),
            }),
            ..Default::default()
        };
        match (listing.review_action.as_str(), decision) {
            ("publish", CatalogReviewDecision::Approve) => {
                update.status = Set("published".to_owned());
                update.has_approved_price = Set(true);
            }
            ("publish", CatalogReviewDecision::Reject) => {
                update.status = Set("offline".to_owned());
                update.price_effective_at = Set(None);
            }
            ("price_change", CatalogReviewDecision::Approve) => {
                if listing.pending_pricing_nano.is_some() {
                    let settings = model_price_review_settings::Entity::find_by_id(1_i16)
                        .one(&self.database)
                        .await?
                        .ok_or_else(|| {
                            invalid_data("model price review settings singleton was not found")
                        })?;
                    if let Some(effective_at) = approved_price_effective_at(
                        OffsetDateTime::now_utc(),
                        settings.approved_price_effective_delay_hours,
                    )? {
                        update.price_effective_at = Set(Some(effective_at));
                    } else {
                        apply_pending_price_immediately(&mut update, &listing)?;
                    }
                }
            }
            ("price_change", CatalogReviewDecision::Reject) => {
                if expected_status == CatalogReviewStatus::Approved
                    && listing.pending_pricing_nano.is_none()
                {
                    return Ok(CatalogReviewResult::InvalidState);
                }
                update.price_effective_at = Set(None);
            }
            ("unpublish" | "violation", CatalogReviewDecision::Approve) => {
                update.status = Set("offline".to_owned());
            }
            ("unpublish" | "violation", CatalogReviewDecision::Reject) => {}
            (value, _) => {
                return Err(invalid_data(format!(
                    "invalid merchant model review action: {value}"
                )));
            }
        }
        let result = merchant_model_listing::Entity::update_many()
            .set(update)
            .col_expr(
                merchant_model_listing::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_model_listing::Column::Id.eq(review_id))
            .filter(model_expected_status_condition(expected_status))
            .exec(&self.database)
            .await?;

        if result.rows_affected == 1 {
            return Ok(CatalogReviewResult::Reviewed);
        }

        Ok(CatalogReviewResult::InvalidState)
    }
}

fn approved_price_effective_at(
    approved_at: OffsetDateTime,
    delay_hours: i32,
) -> Result<Option<OffsetDateTime>, RepositoryError> {
    if delay_hours == 0 {
        return Ok(None);
    }
    approved_at
        .checked_add(time::Duration::hours(i64::from(delay_hours)))
        .map(Some)
        .ok_or_else(|| invalid_data("model price effective time overflow"))
}

fn apply_pending_price_immediately(
    update: &mut merchant_model_listing::ActiveModel,
    listing: &merchant_model_listing::Model,
) -> Result<(), RepositoryError> {
    let values = (
        listing.pending_price_currency.clone(),
        listing.pending_input_price_nano_per_million,
        listing.pending_output_price_nano_per_million,
        listing.pending_pricing_nano.clone(),
    );
    let (Some(currency), Some(input), Some(output), Some(pricing)) = values else {
        return Err(invalid_data(
            "merchant model pending price fields are incomplete",
        ));
    };
    update.price_currency = Set(currency);
    update.input_price_nano_per_million = Set(input);
    update.output_price_nano_per_million = Set(output);
    update.pricing_nano = Set(pricing);
    update.pending_price_currency = Set(None);
    update.pending_input_price_nano_per_million = Set(None);
    update.pending_output_price_nano_per_million = Set(None);
    update.pending_pricing_nano = Set(None);
    update.price_effective_at = Set(None);
    Ok(())
}

fn channel_connection_query(review_id: Uuid) -> Select<merchant_channel::Entity> {
    merchant_channel::Entity::find_by_id(review_id)
        .select_only()
        .column(merchant_channel::Column::Id)
        .column(merchant_channel::Column::BaseUrl)
        .column(merchant_channel::Column::ApiKeyCiphertext)
        .column_as(merchant_channel::Column::ProviderIdentifier, "provider_id")
}

fn model_connection_query(review_id: Uuid) -> Select<merchant_model_listing::Entity> {
    merchant_model_listing::Entity::find_by_id(review_id)
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::MerchantChannel.def(),
        )
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::Model.def(),
        )
        .select_only()
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::ApiKeyCiphertext,
            )),
            "api_key_ciphertext",
        )
        .column_as(
            Expr::col((merchant_channel::Entity, merchant_channel::Column::BaseUrl)),
            "base_url",
        )
        .column_as(
            Expr::col((merchant_channel::Entity, merchant_channel::Column::Id)),
            "channel_id",
        )
        .column_as(
            Expr::col((model::Entity, model::Column::Identifier)),
            "model_identifier",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::ProviderIdentifier,
            )),
            "provider_id",
        )
}

fn channel_review_filtered_query(search: &CatalogReviewSearch) -> Select<merchant_channel::Entity> {
    let mut query = merchant_channel::Entity::find()
        .join(JoinType::InnerJoin, merchant_channel::Relation::User.def())
        .join(JoinType::InnerJoin, merchant_channel::Relation::Brand.def());

    if search.pattern.is_some() || search.exact_channel_id.is_some() || search.exact_id.is_some() {
        let mut condition = Condition::any();
        if let Some(pattern) = search.pattern.as_deref() {
            let like = LikeExpr::new(pattern).escape('\\');
            condition = condition
                .add(Expr::col(merchant_channel::Column::Name).ilike(like.clone()))
                .add(
                    Expr::col((
                        merchant_channel::Entity,
                        merchant_channel::Column::ProviderIdentifier,
                    ))
                    .ilike(like.clone()),
                )
                .add(Expr::col((brand::Entity, brand::Column::Name)).ilike(like.clone()))
                .add(Expr::col((user::Entity, user::Column::Username)).ilike(like.clone()))
                .add(Expr::col((user::Entity, user::Column::Email)).ilike(like));
        }
        if let Some(review_id) = search.exact_id {
            condition = condition.add(merchant_channel::Column::Id.eq(review_id));
        }
        if let Some(channel_id) = search.exact_channel_id {
            condition = condition.add(merchant_channel::Column::PublicId.eq(channel_id));
        }
        query = query.filter(condition);
    }

    if let Some(status) = search.status {
        query = match status {
            CatalogReviewStatus::Pending => {
                query.filter(merchant_channel::Column::Status.eq("pending"))
            }
            CatalogReviewStatus::Rejected => {
                query.filter(merchant_channel::Column::Status.eq("rejected"))
            }
            CatalogReviewStatus::Approved => query.filter(
                Condition::any()
                    .add(merchant_channel::Column::Status.eq("active"))
                    .add(merchant_channel::Column::Status.eq("offline")),
            ),
        };
    }

    query
}

fn channel_review_list_query(search: &CatalogReviewSearch) -> Select<merchant_channel::Entity> {
    channel_review_filtered_query(search)
        .select_only()
        .column(merchant_channel::Column::Id)
        .column_as(merchant_channel::Column::PublicId, "channel_id")
        .column_as(merchant_channel::Column::ReviewAction, "action")
        .column(merchant_channel::Column::Name)
        .column_as(
            Expr::col((user::Entity, user::Column::Username)),
            "merchant_username",
        )
        .column_as(
            Expr::col((user::Entity, user::Column::Email)),
            "merchant_email",
        )
        .column_as(merchant_channel::Column::ProviderIdentifier, "provider_id")
        .column_as(Expr::col((brand::Entity, brand::Column::Name)), "provider")
        .column(merchant_channel::Column::ReviewNote)
        .column_as(merchant_channel::Column::Status, "status")
        .column_as(merchant_channel::Column::ReviewSubmittedAt, "submitted_at")
        .column_as(Expr::cust("COUNT(*) OVER()"), "total_count")
        .order_by_desc(merchant_channel::Column::ReviewSubmittedAt)
        .order_by_desc(merchant_channel::Column::Id)
}

fn model_review_filtered_query(
    search: &CatalogReviewSearch,
) -> Select<merchant_model_listing::Entity> {
    let mut query = merchant_model_listing::Entity::find()
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::User.def(),
        )
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::MerchantChannel.def(),
        )
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::Model.def(),
        )
        .join(JoinType::InnerJoin, merchant_channel::Relation::Brand.def());
    if search.pattern.is_some() || search.exact_channel_id.is_some() || search.exact_id.is_some() {
        let mut condition = Condition::any();
        if let Some(pattern) = search.pattern.as_deref() {
            let like = LikeExpr::new(pattern).escape('\\');
            condition = condition
                .add(Expr::col((model::Entity, model::Column::Name)).ilike(like.clone()))
                .add(Expr::col((model::Entity, model::Column::Identifier)).ilike(like.clone()))
                .add(
                    Expr::col((merchant_channel::Entity, merchant_channel::Column::Name))
                        .ilike(like.clone()),
                )
                .add(Expr::col((brand::Entity, brand::Column::Name)).ilike(like.clone()))
                .add(Expr::col((user::Entity, user::Column::Username)).ilike(like.clone()))
                .add(Expr::col((user::Entity, user::Column::Email)).ilike(like));
        }
        if let Some(review_id) = search.exact_id {
            condition = condition
                .add(merchant_model_listing::Column::Id.eq(review_id))
                .add(merchant_model_listing::Column::ChannelId.eq(review_id));
        }
        if let Some(channel_id) = search.exact_channel_id {
            condition = condition.add(
                Expr::col((merchant_channel::Entity, merchant_channel::Column::PublicId))
                    .eq(channel_id),
            );
        }
        query = query.filter(condition);
    }

    if let Some(status) = search.status {
        query = query.filter(model_expected_status_condition(status));
    }

    query
}

fn model_review_list_query(search: &CatalogReviewSearch) -> Select<merchant_model_listing::Entity> {
    model_review_filtered_query(search)
        .select_only()
        .column(merchant_model_listing::Column::Id)
        .column_as(
            Expr::col((merchant_channel::Entity, merchant_channel::Column::PublicId)),
            "channel_id",
        )
        .column_as(merchant_model_listing::Column::ReviewAction, "action")
        .column_as(Expr::col((model::Entity, model::Column::Name)), "name")
        .column_as(
            Expr::col((model::Entity, model::Column::Identifier)),
            "model_identifier",
        )
        .column_as(
            Expr::col((user::Entity, user::Column::Username)),
            "merchant_username",
        )
        .column_as(
            Expr::col((user::Entity, user::Column::Email)),
            "merchant_email",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::ProviderIdentifier,
            )),
            "provider_id",
        )
        .column_as(Expr::col((brand::Entity, brand::Column::Name)), "provider")
        .column(merchant_model_listing::Column::ContextWindow)
        .column_as(
            merchant_model_listing::Column::OutputPriceNanoPerMillion,
            "current_output_price_nano_per_million",
        )
        .column_as(
            merchant_model_listing::Column::PendingOutputPriceNanoPerMillion,
            "proposed_output_price_nano_per_million",
        )
        .column(merchant_model_listing::Column::PriceEffectiveAt)
        .column(merchant_model_listing::Column::ReviewNote)
        .column_as(merchant_model_listing::Column::ReviewStatus, "status")
        .column_as(
            merchant_model_listing::Column::ReviewSubmittedAt,
            "submitted_at",
        )
        .column_as(Expr::cust("COUNT(*) OVER()"), "total_count")
        .order_by_desc(merchant_model_listing::Column::ReviewSubmittedAt)
        .order_by_desc(merchant_model_listing::Column::Id)
}

fn channel_review_from_row(row: ChannelReviewRow) -> Result<CatalogReview, RepositoryError> {
    Ok(CatalogReview {
        id: row.id.hyphenated().to_string(),
        channel_id: row.channel_id,
        action: review_action(&row.action)?,
        kind: CatalogReviewKind::Channel,
        name: row.name,
        merchant: merchant_name(row.merchant_username, row.merchant_email),
        provider_id: row.provider_id,
        provider: row.provider,
        model_identifier: None,
        context_window: None,
        current_output_price_nano_per_million: None,
        proposed_output_price_nano_per_million: None,
        price_effective_at: None,
        review_note: row.review_note,
        status: channel_status(&row.status)?,
        submitted_at: domain_timestamp(row.submitted_at)?,
    })
}

fn model_review_from_row(row: ModelReviewRow) -> Result<CatalogReview, RepositoryError> {
    let status = match row.status.as_str() {
        "pending" => CatalogReviewStatus::Pending,
        "approved" => CatalogReviewStatus::Approved,
        "rejected" => CatalogReviewStatus::Rejected,
        value => {
            return Err(invalid_data(format!(
                "invalid merchant model status: {value}"
            )));
        }
    };

    Ok(CatalogReview {
        id: row.id.hyphenated().to_string(),
        channel_id: row.channel_id,
        action: review_action(&row.action)?,
        kind: CatalogReviewKind::Model,
        name: row.name,
        merchant: merchant_name(row.merchant_username, row.merchant_email),
        provider_id: row.provider_id,
        provider: row.provider,
        model_identifier: Some(row.model_identifier),
        context_window: Some(row.context_window),
        current_output_price_nano_per_million: Some(row.current_output_price_nano_per_million),
        proposed_output_price_nano_per_million: row.proposed_output_price_nano_per_million,
        price_effective_at: row.price_effective_at.map(domain_timestamp).transpose()?,
        review_note: row.review_note,
        status,
        submitted_at: domain_timestamp(row.submitted_at)?,
    })
}

fn channel_status(value: &str) -> Result<CatalogReviewStatus, RepositoryError> {
    match value {
        "pending" => Ok(CatalogReviewStatus::Pending),
        "rejected" => Ok(CatalogReviewStatus::Rejected),
        "active" | "offline" => Ok(CatalogReviewStatus::Approved),
        value => Err(invalid_data(format!(
            "invalid merchant channel review status: {value}"
        ))),
    }
}

fn review_action(value: &str) -> Result<CatalogReviewAction, RepositoryError> {
    match value {
        "price_change" => Ok(CatalogReviewAction::PriceChange),
        "publish" => Ok(CatalogReviewAction::Publish),
        "unpublish" => Ok(CatalogReviewAction::Unpublish),
        "violation" => Ok(CatalogReviewAction::Violation),
        value => Err(invalid_data(format!(
            "invalid catalog review action: {value}"
        ))),
    }
}

fn channel_review_state(decision: CatalogReviewDecision) -> MerchantChannelStatus {
    match decision {
        CatalogReviewDecision::Approve => MerchantChannelStatus::Active,
        CatalogReviewDecision::Reject => MerchantChannelStatus::Rejected,
    }
}

fn channel_review_update_status(
    expected_status: CatalogReviewStatus,
    decision: CatalogReviewDecision,
) -> Option<MerchantChannelStatus> {
    if expected_status == CatalogReviewStatus::Approved
        && decision == CatalogReviewDecision::Approve
    {
        None
    } else {
        Some(channel_review_state(decision))
    }
}

fn channel_expected_status_condition(status: CatalogReviewStatus) -> Condition {
    match status {
        CatalogReviewStatus::Pending => Condition::all()
            .add(merchant_channel::Column::Status.eq(MerchantChannelStatus::Pending.as_str())),
        CatalogReviewStatus::Rejected => Condition::all()
            .add(merchant_channel::Column::Status.eq(MerchantChannelStatus::Rejected.as_str())),
        CatalogReviewStatus::Approved => Condition::any()
            .add(merchant_channel::Column::Status.eq(MerchantChannelStatus::Active.as_str()))
            .add(merchant_channel::Column::Status.eq(MerchantChannelStatus::Offline.as_str())),
    }
}

fn model_expected_status_condition(status: CatalogReviewStatus) -> Condition {
    Condition::all().add(
        merchant_model_listing::Column::ReviewStatus.eq(match status {
            CatalogReviewStatus::Pending => "pending",
            CatalogReviewStatus::Approved => "approved",
            CatalogReviewStatus::Rejected => "rejected",
        }),
    )
}

fn merchant_name(username: String, email: String) -> String {
    let username = username.trim();
    if username.is_empty() {
        email
    } else {
        username.to_owned()
    }
}

fn review_result_for_existence(exists: bool) -> Result<CatalogReviewResult, RepositoryError> {
    Ok(if exists {
        CatalogReviewResult::InvalidState
    } else {
        CatalogReviewResult::NotFound
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32).map_err(invalid_data)
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

#[cfg(test)]
#[path = "../../tests/unit/repository_catalog_review.rs"]
mod tests;

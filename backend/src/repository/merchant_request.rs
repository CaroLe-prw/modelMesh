use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Select, Set, sea_query::LikeExpr,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        MerchantRequest, MerchantRequestAction, MerchantRequestOrigin, MerchantRequestSortField,
        MerchantRequestStatus, MerchantRequestType, Page, Pagination, SortDirection, UserId,
    },
    entity::merchant_business_log,
};

use super::RepositoryError;

#[derive(Clone)]
pub struct MerchantRequestRepository {
    database: DatabaseConnection,
}

pub struct MerchantRequestSearch {
    pub exact_id: Option<i64>,
    pub pattern: Option<String>,
    pub status: Option<MerchantRequestStatus>,
}

pub struct NewMerchantRequestRecord {
    pub id: String,
    pub merchant_user_id: UserId,
    pub request_type: MerchantRequestType,
    pub subject: String,
    pub description: String,
}

impl MerchantRequestRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_by_user(
        &self,
        user_id: UserId,
        search: &MerchantRequestSearch,
        pagination: Pagination,
        sort_by: MerchantRequestSortField,
        sort_order: SortDirection,
    ) -> Result<Page<MerchantRequest>, RepositoryError> {
        let paginator = merchant_business_log_query(user_id, search, sort_by, sort_order)
            .paginate(&self.database, u64::from(pagination.page_size()));
        let total = paginator.num_items().await?;
        let requests = paginator
            .fetch_page(u64::from(pagination.page_index()))
            .await?
            .into_iter()
            .map(merchant_request_from_model)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(requests, pagination, total))
    }

    pub async fn create(
        &self,
        record: NewMerchantRequestRecord,
    ) -> Result<MerchantRequest, RepositoryError> {
        let request = merchant_business_log::ActiveModel {
            merchant_user_id: Set(record.merchant_user_id),
            origin: Set("manual".to_owned()),
            resource_type: Set("manual".to_owned()),
            resource_id: Set(Uuid::parse_str(&record.id).map_err(invalid_data)?),
            request_type: Set(record.request_type.as_database_str().to_owned()),
            subject: Set(record.subject),
            description: Set(record.description),
            action: Set(None),
            status: Set(MerchantRequestStatus::Pending.as_database_str().to_owned()),
            ..Default::default()
        }
        .insert(&self.database)
        .await?;

        merchant_request_from_model(request)
    }
}

fn merchant_business_log_query(
    user_id: UserId,
    search: &MerchantRequestSearch,
    sort_by: MerchantRequestSortField,
    sort_order: SortDirection,
) -> Select<merchant_business_log::Entity> {
    let mut query = merchant_business_log::Entity::find()
        .filter(merchant_business_log::Column::MerchantUserId.eq(user_id));

    if search.pattern.is_some() || search.exact_id.is_some() {
        let mut condition = Condition::any();
        if let Some(pattern) = search.pattern.as_deref() {
            let like = LikeExpr::new(pattern).escape('\\');
            condition = condition
                .add(merchant_business_log::Column::Subject.ilike(like.clone()))
                .add(merchant_business_log::Column::Description.ilike(like.clone()))
                .add(merchant_business_log::Column::ReviewNote.ilike(like));
        }
        if let Some(exact_id) = search.exact_id {
            condition = condition.add(merchant_business_log::Column::Id.eq(exact_id));
        }
        query = query.filter(condition);
    }
    if let Some(status) = search.status {
        query = query.filter(merchant_business_log::Column::Status.eq(status.as_database_str()));
    }

    let sort_column = match sort_by {
        MerchantRequestSortField::SubmittedAt => merchant_business_log::Column::SubmittedAt,
        MerchantRequestSortField::UpdatedAt => merchant_business_log::Column::UpdatedAt,
    };
    match sort_order {
        SortDirection::Asc => query
            .order_by_asc(sort_column)
            .order_by_asc(merchant_business_log::Column::Id),
        SortDirection::Desc => query
            .order_by_desc(sort_column)
            .order_by_desc(merchant_business_log::Column::Id),
    }
}

fn merchant_request_from_model(
    model: merchant_business_log::Model,
) -> Result<MerchantRequest, RepositoryError> {
    Ok(MerchantRequest {
        id: format!("log_{}", model.id),
        origin: MerchantRequestOrigin::from_database(&model.origin).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "unknown merchant business log origin `{}`",
                model.origin
            ))
        })?,
        action: model.action.as_deref().map(request_action).transpose()?,
        request_type: MerchantRequestType::from_database(&model.request_type).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "unknown merchant business log type `{}`",
                model.request_type
            ))
        })?,
        subject: model.subject,
        description: model.description,
        status: MerchantRequestStatus::from_database(&model.status).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "unknown merchant business log status `{}`",
                model.status
            ))
        })?,
        review_note: model.review_note,
        submitted_at: domain_timestamp(model.submitted_at)?,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn request_action(value: &str) -> Result<MerchantRequestAction, RepositoryError> {
    MerchantRequestAction::from_database(value).ok_or_else(|| {
        RepositoryError::InvalidData(format!("unknown merchant business log action `{value}`"))
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_request.rs"]
mod tests;

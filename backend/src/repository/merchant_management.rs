use std::collections::HashMap;

use jiff::Timestamp;
use sea_orm::{
    ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait, FromQueryResult, JoinType,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select, Set,
    TransactionTrait,
    sea_query::{Expr, LikeExpr, extension::postgres::PgExpr},
};
use time::OffsetDateTime;

use crate::{
    domain::{
        AccountRole, ManagedMerchant, ManagedMerchantApplication, ManagedMerchantStatus,
        MerchantAccessStatus, MerchantApplicationStatus, MerchantReviewDecision, Page, Pagination,
        UserId,
    },
    entity::{merchant_application, user},
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct MerchantManagementRepository {
    database: DatabaseConnection,
}

pub struct MerchantSearch {
    pub exact_user_id: Option<UserId>,
    pub pattern: Option<String>,
    pub status: Option<ManagedMerchantStatus>,
}

pub struct UpdateManagedMerchantRecord {
    pub name: String,
    pub email: String,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

pub struct ReviewManagedMerchantRecord {
    pub reviewer_user_id: UserId,
    pub decision: MerchantReviewDecision,
    pub review_note: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ManagedMerchantReviewResult {
    Reviewed,
    NotFound,
    InvalidState,
}

#[derive(Debug, FromQueryResult)]
struct ManagedMerchantRow {
    id: i64,
    name: String,
    email: String,
    status: String,
    channel_count: Option<i64>,
    model_count: Option<i64>,
    balance_microusd: i64,
    concurrency_limit: i64,
    rpm_limit: i64,
    created_at: OffsetDateTime,
    application_id: Option<i64>,
    application_code: Option<String>,
    application_avatar_url: Option<String>,
    application_website: Option<String>,
    application_description: Option<String>,
    application_submitted_at: Option<OffsetDateTime>,
    application_updated_at: Option<OffsetDateTime>,
    total_count: i64,
}

impl MerchantManagementRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(
        &self,
        search: &MerchantSearch,
        pagination: Pagination,
    ) -> Result<Page<ManagedMerchant>, RepositoryError> {
        let rows = merchant_list_query(search)
            .limit(u64::from(pagination.page_size()))
            .offset(u64::from(pagination.page_index()) * u64::from(pagination.page_size()))
            .into_model::<ManagedMerchantRow>()
            .all(&self.database)
            .await?;
        let total = match rows.first() {
            Some(row) => u64::try_from(row.total_count)
                .map_err(|error| RepositoryError::InvalidData(error.to_string()))?,
            None if pagination.page_index() > 0 => {
                merchant_filtered_query(search)
                    .count(&self.database)
                    .await?
            }
            None => 0,
        };
        let items = rows
            .into_iter()
            .map(managed_merchant_from_row)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    pub async fn update(
        &self,
        user_id: UserId,
        update: UpdateManagedMerchantRecord,
    ) -> Result<bool, RepositoryError> {
        let transaction = self.database.begin().await?;
        let Some(managed_user) = user::Entity::find_by_id(user_id)
            .lock_exclusive()
            .one(&transaction)
            .await?
        else {
            transaction.rollback().await?;
            return Ok(false);
        };
        let application = merchant_application::Entity::find()
            .filter(merchant_application::Column::UserId.eq(user_id))
            .lock_exclusive()
            .one(&transaction)
            .await?;

        if !is_managed_merchant(&managed_user, application.as_ref()) {
            transaction.rollback().await?;
            return Ok(false);
        }

        user::Entity::update_many()
            .set(user::ActiveModel {
                email: Set(update.email),
                username: Set(update.name.clone()),
                concurrency_limit: Set(update.concurrency_limit),
                rpm_limit: Set(update.rpm_limit),
                ..Default::default()
            })
            .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
            .filter(user::Column::Id.eq(user_id))
            .exec(&transaction)
            .await
            .map_err(map_write_error)?;

        if application.is_some() {
            merchant_application::Entity::update_many()
                .set(merchant_application::ActiveModel {
                    business_name: Set(update.name),
                    ..Default::default()
                })
                .col_expr(
                    merchant_application::Column::UpdatedAt,
                    Expr::current_timestamp(),
                )
                .filter(merchant_application::Column::UserId.eq(user_id))
                .exec(&transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(true)
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        status: MerchantAccessStatus,
    ) -> Result<bool, RepositoryError> {
        let result = user::Entity::update_many()
            .set(user::ActiveModel {
                merchant_status: Set(status.as_str().to_owned()),
                ..Default::default()
            })
            .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
            .filter(user::Column::Id.eq(user_id))
            .filter(user::Column::Role.eq(AccountRole::Merchant.as_str()))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected > 0)
    }

    pub async fn update_status_batch(
        &self,
        user_ids: &[UserId],
        status: MerchantAccessStatus,
    ) -> Result<Vec<UserId>, RepositoryError> {
        if user_ids.is_empty() {
            return Ok(Vec::new());
        }

        let transaction = self.database.begin().await?;
        let updated_user_ids = user::Entity::find()
            .filter(user::Column::Id.is_in(user_ids.iter().copied()))
            .filter(user::Column::Role.eq(AccountRole::Merchant.as_str()))
            .filter(user::Column::MerchantStatus.ne(status.as_str()))
            .lock_exclusive()
            .all(&transaction)
            .await?
            .into_iter()
            .map(|managed_user| managed_user.id)
            .collect::<Vec<_>>();

        if !updated_user_ids.is_empty() {
            user::Entity::update_many()
                .set(user::ActiveModel {
                    merchant_status: Set(status.as_str().to_owned()),
                    ..Default::default()
                })
                .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
                .filter(user::Column::Id.is_in(updated_user_ids.iter().copied()))
                .exec(&transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(updated_user_ids)
    }

    pub async fn review(
        &self,
        user_id: UserId,
        review: ReviewManagedMerchantRecord,
    ) -> Result<ManagedMerchantReviewResult, RepositoryError> {
        let transaction = self.database.begin().await?;
        let Some(managed_user) = user::Entity::find_by_id(user_id)
            .lock_exclusive()
            .one(&transaction)
            .await?
        else {
            transaction.rollback().await?;
            return Ok(ManagedMerchantReviewResult::NotFound);
        };
        let Some(application) = merchant_application::Entity::find()
            .filter(merchant_application::Column::UserId.eq(user_id))
            .lock_exclusive()
            .one(&transaction)
            .await?
        else {
            transaction.rollback().await?;
            return Ok(ManagedMerchantReviewResult::NotFound);
        };

        if managed_user.role != AccountRole::Personal.as_str()
            || application.status != MerchantApplicationStatus::Pending.as_str()
        {
            transaction.rollback().await?;
            return Ok(ManagedMerchantReviewResult::InvalidState);
        }

        merchant_application::Entity::update_many()
            .set(merchant_application::ActiveModel {
                status: Set(review.decision.application_status().to_owned()),
                review_note: Set(review.review_note),
                reviewed_by: Set(Some(review.reviewer_user_id)),
                ..Default::default()
            })
            .col_expr(
                merchant_application::Column::ReviewedAt,
                Expr::current_timestamp(),
            )
            .col_expr(
                merchant_application::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_application::Column::UserId.eq(user_id))
            .filter(
                merchant_application::Column::Status
                    .eq(MerchantApplicationStatus::Pending.as_str()),
            )
            .exec(&transaction)
            .await?;

        if review.decision == MerchantReviewDecision::Approve {
            user::Entity::update_many()
                .set(user::ActiveModel {
                    role: Set(AccountRole::Merchant.as_str().to_owned()),
                    merchant_status: Set(MerchantAccessStatus::Active.as_str().to_owned()),
                    ..Default::default()
                })
                .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
                .filter(user::Column::Id.eq(user_id))
                .exec(&transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(ManagedMerchantReviewResult::Reviewed)
    }

    pub async fn remove(&self, user_id: UserId) -> Result<bool, RepositoryError> {
        self.remove_batch(&[user_id])
            .await
            .map(|removed_user_ids| !removed_user_ids.is_empty())
    }

    pub async fn remove_batch(&self, user_ids: &[UserId]) -> Result<Vec<UserId>, RepositoryError> {
        if user_ids.is_empty() {
            return Ok(Vec::new());
        }

        let transaction = self.database.begin().await?;
        let managed_users = user::Entity::find()
            .filter(user::Column::Id.is_in(user_ids.iter().copied()))
            .lock_exclusive()
            .all(&transaction)
            .await?;
        let applications = merchant_application::Entity::find()
            .filter(merchant_application::Column::UserId.is_in(user_ids.iter().copied()))
            .lock_exclusive()
            .all(&transaction)
            .await?;
        let applications_by_user = applications
            .iter()
            .map(|application| (application.user_id, application))
            .collect::<HashMap<_, _>>();
        let removed_user_ids = managed_users
            .iter()
            .filter(|managed_user| {
                is_managed_merchant(
                    managed_user,
                    applications_by_user.get(&managed_user.id).copied(),
                )
            })
            .map(|managed_user| managed_user.id)
            .collect::<Vec<_>>();

        if removed_user_ids.is_empty() {
            transaction.commit().await?;
            return Ok(Vec::new());
        }

        merchant_application::Entity::delete_many()
            .filter(merchant_application::Column::UserId.is_in(removed_user_ids.iter().copied()))
            .exec(&transaction)
            .await?;

        user::Entity::update_many()
            .set(user::ActiveModel {
                role: Set(AccountRole::Personal.as_str().to_owned()),
                merchant_status: Set(MerchantAccessStatus::Active.as_str().to_owned()),
                ..Default::default()
            })
            .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
            .filter(user::Column::Id.is_in(removed_user_ids.iter().copied()))
            .filter(user::Column::Role.eq(AccountRole::Merchant.as_str()))
            .exec(&transaction)
            .await?;

        transaction.commit().await?;
        Ok(removed_user_ids)
    }
}

fn is_managed_merchant(
    managed_user: &user::Model,
    application: Option<&merchant_application::Model>,
) -> bool {
    managed_user.role == AccountRole::Merchant.as_str()
        || (managed_user.role == AccountRole::Personal.as_str()
            && application.is_some_and(|application| {
                matches!(
                    MerchantApplicationStatus::from_database(&application.status),
                    Some(MerchantApplicationStatus::Pending | MerchantApplicationStatus::Rejected)
                )
            }))
}

fn map_write_error(error: DbErr) -> RepositoryError {
    if database_constraint(&error) == Some("users_email_key") {
        return RepositoryError::Conflict(RepositoryConflict::UserEmail);
    }

    error.into()
}

fn merchant_filtered_query(search: &MerchantSearch) -> Select<user::Entity> {
    let mut query = user::Entity::find()
        .join(
            JoinType::LeftJoin,
            user::Relation::MerchantApplication.def(),
        )
        .filter(
            Condition::any()
                .add(user::Column::Role.eq(AccountRole::Merchant.as_str()))
                .add(
                    Condition::all()
                        .add(user::Column::Role.eq(AccountRole::Personal.as_str()))
                        .add(
                            Condition::any()
                                .add(
                                    merchant_application::Column::Status
                                        .eq(MerchantApplicationStatus::Pending.as_str()),
                                )
                                .add(
                                    merchant_application::Column::Status
                                        .eq(MerchantApplicationStatus::Rejected.as_str()),
                                ),
                        ),
                ),
        );

    if search.pattern.is_some() || search.exact_user_id.is_some() {
        let mut condition = Condition::any();
        if let Some(pattern) = search.pattern.as_deref() {
            let like = LikeExpr::new(pattern).escape('\\');
            condition = condition
                .add(Expr::col(user::Column::Email).ilike(like.clone()))
                .add(Expr::col(user::Column::Username).ilike(like.clone()))
                .add(
                    Expr::col((
                        merchant_application::Entity,
                        merchant_application::Column::BusinessName,
                    ))
                    .ilike(like),
                );
        }
        if let Some(user_id) = search.exact_user_id {
            condition = condition.add(user::Column::Id.eq(user_id));
        }
        query = query.filter(condition);
    }

    if let Some(status) = search.status {
        query = match status {
            ManagedMerchantStatus::Active => query
                .filter(user::Column::Role.eq(AccountRole::Merchant.as_str()))
                .filter(user::Column::MerchantStatus.eq(MerchantAccessStatus::Active.as_str())),
            ManagedMerchantStatus::Pending => query
                .filter(user::Column::Role.eq(AccountRole::Personal.as_str()))
                .filter(
                    merchant_application::Column::Status
                        .eq(MerchantApplicationStatus::Pending.as_str()),
                ),
            ManagedMerchantStatus::Rejected => query
                .filter(user::Column::Role.eq(AccountRole::Personal.as_str()))
                .filter(
                    merchant_application::Column::Status
                        .eq(MerchantApplicationStatus::Rejected.as_str()),
                ),
            ManagedMerchantStatus::Suspended => query
                .filter(user::Column::Role.eq(AccountRole::Merchant.as_str()))
                .filter(user::Column::MerchantStatus.eq(MerchantAccessStatus::Disabled.as_str())),
        };
    }

    query
}

fn merchant_list_query(search: &MerchantSearch) -> Select<user::Entity> {
    merchant_filtered_query(search)
        .select_only()
        .column(user::Column::Id)
        .column_as(
            Expr::cust(
                "COALESCE(NULLIF(merchant_applications.business_name, ''), NULLIF(users.username, ''), users.email)",
            ),
            "name",
        )
        .column(user::Column::Email)
        .column_as(
            Expr::cust(
                "CASE WHEN users.role = 'merchant' AND users.merchant_status = 'disabled' THEN 'suspended' WHEN users.role = 'merchant' THEN 'active' WHEN merchant_applications.status = 'rejected' THEN 'rejected' ELSE 'pending' END",
            ),
            "status",
        )
        .column_as(Expr::cust("NULL::BIGINT"), "channel_count")
        .column_as(Expr::cust("NULL::BIGINT"), "model_count")
        .column(user::Column::BalanceMicrousd)
        .column(user::Column::ConcurrencyLimit)
        .column(user::Column::RpmLimit)
        .column(user::Column::CreatedAt)
        .column_as(
            Expr::col((merchant_application::Entity, merchant_application::Column::Id)),
            "application_id",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::ApplicationCode,
            )),
            "application_code",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::AvatarUrl,
            )),
            "application_avatar_url",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::Website,
            )),
            "application_website",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::Description,
            )),
            "application_description",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::CreatedAt,
            )),
            "application_submitted_at",
        )
        .column_as(
            Expr::col((
                merchant_application::Entity,
                merchant_application::Column::UpdatedAt,
            )),
            "application_updated_at",
        )
        .column_as(Expr::cust("COUNT(*) OVER()"), "total_count")
        .order_by_desc(user::Column::CreatedAt)
        .order_by_desc(user::Column::Id)
}

fn managed_merchant_from_row(row: ManagedMerchantRow) -> Result<ManagedMerchant, RepositoryError> {
    let status = match row.status.as_str() {
        "active" => ManagedMerchantStatus::Active,
        "pending" => ManagedMerchantStatus::Pending,
        "rejected" => ManagedMerchantStatus::Rejected,
        "suspended" => ManagedMerchantStatus::Suspended,
        value => {
            return Err(RepositoryError::InvalidData(format!(
                "unknown managed merchant status `{value}`"
            )));
        }
    };
    let application = managed_merchant_application_from_row(&row)?;

    Ok(ManagedMerchant {
        id: row.id,
        name: row.name,
        email: row.email,
        status,
        channel_count: row
            .channel_count
            .map(u64::try_from)
            .transpose()
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?,
        model_count: row
            .model_count
            .map(u64::try_from)
            .transpose()
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?,
        balance_microusd: row.balance_microusd,
        concurrency_limit: row.concurrency_limit,
        rpm_limit: row.rpm_limit,
        created_at: domain_timestamp(row.created_at)?,
        application,
    })
}

fn managed_merchant_application_from_row(
    row: &ManagedMerchantRow,
) -> Result<Option<ManagedMerchantApplication>, RepositoryError> {
    if row.application_id.is_none() {
        return Ok(None);
    }

    let application_code = row.application_code.clone().ok_or_else(|| {
        RepositoryError::InvalidData("merchant application code is missing".to_owned())
    })?;
    let description = row.application_description.clone().ok_or_else(|| {
        RepositoryError::InvalidData("merchant application description is missing".to_owned())
    })?;
    let submitted_at = row.application_submitted_at.ok_or_else(|| {
        RepositoryError::InvalidData("merchant application submission time is missing".to_owned())
    })?;
    let updated_at = row.application_updated_at.ok_or_else(|| {
        RepositoryError::InvalidData("merchant application update time is missing".to_owned())
    })?;

    Ok(Some(ManagedMerchantApplication {
        application_code,
        avatar_url: row.application_avatar_url.clone(),
        website: row.application_website.clone(),
        description,
        submitted_at: domain_timestamp(submitted_at)?,
        updated_at: domain_timestamp(updated_at)?,
    }))
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_management.rs"]
mod tests;

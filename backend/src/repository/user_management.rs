use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::NotSet,
    ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, DatabaseTransaction, DbErr,
    EntityTrait, FromQueryResult, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Select,
    Set, Statement, TransactionTrait,
    entity::prelude::IpNetwork,
    sea_query::{
        Alias, Expr, ExprTrait, LikeExpr, NullOrdering, Order, SimpleExpr,
        extension::postgres::PgExpr,
    },
};
use time::OffsetDateTime;

use crate::{
    domain::{
        AccountRole, AccountStatus, ManagedUser, ManagedUserBalanceAdjustment,
        ManagedUserBalanceAdjustmentKind, ManagedUserBalanceAdjustmentPage, ManagedUserSort,
        ManagedUserSortField, Page, Pagination, SortDirection, UserId,
    },
    entity::user,
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct UserManagementRepository {
    database: DatabaseConnection,
}

pub struct UserSearch {
    pub exact_user_id: Option<UserId>,
    pub pattern: Option<String>,
    pub role: Option<AccountRole>,
    pub status: Option<AccountStatus>,
}

pub struct UpdateManagedUserRecord {
    pub email: String,
    pub password_hash: Option<String>,
    pub username: String,
    pub notes: String,
    pub role: AccountRole,
    pub status: AccountStatus,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

pub struct CreateManagedUserRecord {
    pub email: String,
    pub password_hash: String,
    pub username: String,
    pub role: AccountRole,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

pub enum ManagedUserBalanceAdjustmentResult {
    Updated(Box<ManagedUser>),
    NotFound,
    InvalidBalance,
}

pub enum ManagedUserDeletionResult {
    Deleted(u64),
    NotFound,
    Protected,
    Referenced,
}

#[derive(Debug, FromQueryResult)]
struct ManagedUserRow {
    id: i64,
    email: String,
    username: String,
    notes: String,
    role: String,
    status: String,
    balance_microusd: i64,
    concurrency_limit: i64,
    rpm_limit: i64,
    last_login_at: Option<OffsetDateTime>,
    last_login_ip: Option<IpNetwork>,
    last_active_at: Option<OffsetDateTime>,
    last_used_at: Option<OffsetDateTime>,
    created_at: OffsetDateTime,
    total_count: i64,
}

#[derive(Debug, FromQueryResult)]
struct ManagedUserBalanceAdjustmentRow {
    id: i64,
    user_id: i64,
    operator_user_id: i64,
    adjustment_type: String,
    amount_microusd: i64,
    balance_after_microusd: i64,
    notes: String,
    created_at: OffsetDateTime,
}

#[derive(Debug, FromQueryResult)]
struct ManagedUserBalanceSummaryRow {
    total_deposited_microusd: i64,
    total_count: i64,
}

impl UserManagementRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(
        &self,
        search: &UserSearch,
        pagination: Pagination,
        sort: ManagedUserSort,
    ) -> Result<Page<ManagedUser>, RepositoryError> {
        let users = user_list_query(search, sort)
            .limit(u64::from(pagination.page_size()))
            .offset(u64::from(pagination.page_index()) * u64::from(pagination.page_size()))
            .into_model::<ManagedUserRow>()
            .all(&self.database)
            .await?;
        let total = match users.first() {
            Some(user) => u64::try_from(user.total_count)
                .map_err(|error| RepositoryError::InvalidData(error.to_string()))?,
            None if pagination.page_index() > 0 => {
                user_filtered_query(search).count(&self.database).await?
            }
            None => 0,
        };
        let items = users
            .into_iter()
            .map(managed_user_from_row)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    pub async fn create(
        &self,
        operator_user_id: UserId,
        create: CreateManagedUserRecord,
    ) -> Result<ManagedUser, RepositoryError> {
        let transaction = self.database.begin().await?;
        let created_user = user::ActiveModel {
            email: Set(create.email),
            password_hash: Set(create.password_hash),
            username: Set(create.username),
            notes: Set(String::new()),
            role: Set(create.role.as_str().to_owned()),
            status: Set(AccountStatus::Active.as_str().to_owned()),
            balance_microusd: Set(0),
            concurrency_limit: Set(create.concurrency_limit),
            rpm_limit: Set(create.rpm_limit),
            ..Default::default()
        }
        .insert(&transaction)
        .await
        .map_err(map_write_user_error)?;

        if create.balance_microusd > 0
            && !adjust_balance(
                &transaction,
                operator_user_id,
                created_user.id,
                create.balance_microusd,
                "",
                ManagedUserBalanceAdjustmentKind::Deposit,
            )
            .await?
        {
            return Err(RepositoryError::InvalidData(
                "new user initial balance could not be recorded".to_owned(),
            ));
        }

        let user = user_list_query(
            &UserSearch {
                exact_user_id: Some(created_user.id),
                pattern: None,
                role: None,
                status: None,
            },
            ManagedUserSort::default(),
        )
        .into_model::<ManagedUserRow>()
        .one(&transaction)
        .await?
        .map(managed_user_from_row)
        .transpose()?
        .ok_or_else(|| {
            RepositoryError::InvalidData("new user disappeared before commit".to_owned())
        })?;
        transaction.commit().await?;

        Ok(user)
    }

    pub async fn update(
        &self,
        user_id: UserId,
        update: UpdateManagedUserRecord,
    ) -> Result<Option<ManagedUser>, RepositoryError> {
        let result = user::Entity::update_many()
            .set(user::ActiveModel {
                email: Set(update.email),
                password_hash: update.password_hash.map_or(NotSet, Set),
                username: Set(update.username),
                notes: Set(update.notes),
                role: Set(update.role.as_str().to_owned()),
                status: Set(update.status.as_str().to_owned()),
                concurrency_limit: Set(update.concurrency_limit),
                rpm_limit: Set(update.rpm_limit),
                ..Default::default()
            })
            .col_expr(user::Column::UpdatedAt, Expr::current_timestamp())
            .filter(user::Column::Id.eq(user_id))
            .exec(&self.database)
            .await
            .map_err(map_write_user_error)?;

        if result.rows_affected == 0 {
            return Ok(None);
        }

        user_list_query(
            &UserSearch {
                exact_user_id: Some(user_id),
                pattern: None,
                role: None,
                status: None,
            },
            ManagedUserSort::default(),
        )
        .into_model::<ManagedUserRow>()
        .one(&self.database)
        .await?
        .map(managed_user_from_row)
        .transpose()
    }

    pub async fn delete(
        &self,
        user_ids: &[UserId],
    ) -> Result<ManagedUserDeletionResult, RepositoryError> {
        let transaction = self.database.begin().await?;
        let users = user::Entity::find()
            .filter(user::Column::Id.is_in(user_ids.iter().copied()))
            .lock_exclusive()
            .all(&transaction)
            .await?;

        if users.len() != user_ids.len() {
            transaction.rollback().await?;
            return Ok(ManagedUserDeletionResult::NotFound);
        }
        if users
            .iter()
            .any(|user| user.role == AccountRole::Admin.as_str())
        {
            transaction.rollback().await?;
            return Ok(ManagedUserDeletionResult::Protected);
        }

        let deleted = match user::Entity::delete_many()
            .filter(user::Column::Id.is_in(user_ids.iter().copied()))
            .exec(&transaction)
            .await
        {
            Ok(result) => result.rows_affected,
            Err(error)
                if database_constraint(&error) == Some("user_balance_adjustments_user_id_fkey")
                    || database_constraint(&error)
                        == Some("user_balance_adjustments_operator_user_id_fkey") =>
            {
                transaction.rollback().await?;
                return Ok(ManagedUserDeletionResult::Referenced);
            }
            Err(error) => return Err(error.into()),
        };
        transaction.commit().await?;

        Ok(ManagedUserDeletionResult::Deleted(deleted))
    }

    pub async fn list_balance_adjustments(
        &self,
        user_id: UserId,
        pagination: Pagination,
        adjustment_type: Option<ManagedUserBalanceAdjustmentKind>,
    ) -> Result<Option<ManagedUserBalanceAdjustmentPage>, RepositoryError> {
        let adjustment_type = adjustment_type.map(|value| value.as_str().to_owned());
        let summary =
            ManagedUserBalanceSummaryRow::find_by_statement(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                r#"
SELECT
    COALESCE(
        SUM(adjustment.amount_microusd)
            FILTER (WHERE adjustment.adjustment_type = 'deposit'),
        0
    )::BIGINT AS total_deposited_microusd,
    COUNT(adjustment.id)
        FILTER (WHERE $2::TEXT IS NULL OR adjustment.adjustment_type = $2) AS total_count
FROM users AS managed_user
LEFT JOIN user_balance_adjustments AS adjustment
    ON adjustment.user_id = managed_user.id
WHERE managed_user.id = $1
GROUP BY managed_user.id
"#,
                [user_id.into(), adjustment_type.clone().into()],
            ))
            .one(&self.database)
            .await?;
        let Some(summary) = summary else {
            return Ok(None);
        };
        let total = u64::try_from(summary.total_count)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
        let rows =
            ManagedUserBalanceAdjustmentRow::find_by_statement(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                r#"
SELECT
    id,
    user_id,
    operator_user_id,
    adjustment_type,
    amount_microusd,
    balance_after_microusd,
    notes,
    created_at
FROM user_balance_adjustments
WHERE user_id = $1
  AND ($2::TEXT IS NULL OR adjustment_type = $2)
ORDER BY created_at DESC, id DESC
LIMIT $3
OFFSET $4
"#,
                [
                    user_id.into(),
                    adjustment_type.into(),
                    i64::from(pagination.page_size()).into(),
                    (i64::from(pagination.page_index()) * i64::from(pagination.page_size())).into(),
                ],
            ))
            .all(&self.database)
            .await?;
        let items = rows
            .into_iter()
            .map(managed_user_balance_adjustment_from_row)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Some(ManagedUserBalanceAdjustmentPage {
            page: Page::new(items, pagination, total),
            total_deposited_microusd: summary.total_deposited_microusd,
        }))
    }

    pub async fn adjust_balance(
        &self,
        operator_user_id: UserId,
        user_id: UserId,
        amount_microusd: i64,
        notes: &str,
        adjustment: ManagedUserBalanceAdjustmentKind,
    ) -> Result<ManagedUserBalanceAdjustmentResult, RepositoryError> {
        let transaction = self.database.begin().await?;
        let updated = adjust_balance(
            &transaction,
            operator_user_id,
            user_id,
            amount_microusd,
            notes,
            adjustment,
        )
        .await?;
        if !updated {
            let user_exists = user::Entity::find_by_id(user_id)
                .one(&transaction)
                .await?
                .is_some();
            transaction.rollback().await?;
            return Ok(if user_exists {
                ManagedUserBalanceAdjustmentResult::InvalidBalance
            } else {
                ManagedUserBalanceAdjustmentResult::NotFound
            });
        }

        let user = user_list_query(
            &UserSearch {
                exact_user_id: Some(user_id),
                pattern: None,
                role: None,
                status: None,
            },
            ManagedUserSort::default(),
        )
        .into_model::<ManagedUserRow>()
        .one(&transaction)
        .await?
        .map(managed_user_from_row)
        .transpose()?;
        transaction.commit().await?;

        Ok(match user {
            Some(user) => ManagedUserBalanceAdjustmentResult::Updated(Box::new(user)),
            None => ManagedUserBalanceAdjustmentResult::NotFound,
        })
    }
}

async fn adjust_balance(
    transaction: &DatabaseTransaction,
    operator_user_id: UserId,
    user_id: UserId,
    amount_microusd: i64,
    notes: &str,
    adjustment: ManagedUserBalanceAdjustmentKind,
) -> Result<bool, RepositoryError> {
    let result = transaction
        .query_one_raw(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"
WITH updated_user AS (
    UPDATE users
    SET balance_microusd = balance_microusd + $5,
        updated_at = NOW()
    WHERE id = $2
      AND balance_microusd + $5 BETWEEN 0 AND 9007199254740991
    RETURNING balance_microusd
)
INSERT INTO user_balance_adjustments (
    user_id,
    operator_user_id,
    adjustment_type,
    amount_microusd,
    balance_after_microusd,
    notes
)
SELECT $2, $3, $4, $1, balance_microusd, $6
FROM updated_user
RETURNING id
"#,
            [
                amount_microusd.into(),
                user_id.into(),
                operator_user_id.into(),
                adjustment.as_str().into(),
                adjustment.delta(amount_microusd).into(),
                notes.into(),
            ],
        ))
        .await?;

    Ok(result.is_some())
}

fn user_filtered_query(search: &UserSearch) -> Select<user::Entity> {
    let mut query = user::Entity::find();

    if search.pattern.is_some() || search.exact_user_id.is_some() {
        let mut search_condition = Condition::any();

        if let Some(pattern) = search.pattern.as_deref() {
            let like = LikeExpr::new(pattern).escape('\\');
            search_condition = search_condition
                .add(Expr::col(user::Column::Email).ilike(like.clone()))
                .add(Expr::col(user::Column::Username).ilike(like.clone()))
                .add(
                    Expr::col(user::Column::LastLoginIp)
                        .cast_as(Alias::new("text"))
                        .ilike(like),
                );
        }
        if let Some(user_id) = search.exact_user_id {
            search_condition = search_condition.add(user::Column::Id.eq(user_id));
        }

        query = query.filter(search_condition);
    }
    if let Some(role) = search.role {
        query = query.filter(user::Column::Role.eq(role.as_str()));
    }
    if let Some(status) = search.status {
        query = query.filter(user::Column::Status.eq(status.as_str()));
    }

    query
}

fn user_list_query(search: &UserSearch, sort: ManagedUserSort) -> Select<user::Entity> {
    let last_used_at = last_used_at_expression();
    let query = user_filtered_query(search)
        .select_only()
        .columns([
            user::Column::Id,
            user::Column::Email,
            user::Column::Username,
            user::Column::Notes,
            user::Column::Role,
            user::Column::Status,
            user::Column::BalanceMicrousd,
            user::Column::ConcurrencyLimit,
            user::Column::RpmLimit,
            user::Column::LastLoginAt,
            user::Column::LastLoginIp,
            user::Column::LastActiveAt,
            user::Column::CreatedAt,
        ])
        .column_as(last_used_at.clone(), "last_used_at")
        .column_as(Expr::cust("COUNT(*) OVER()"), "total_count");
    let order = match sort.direction {
        SortDirection::Asc => Order::Asc,
        SortDirection::Desc => Order::Desc,
    };

    match sort.field {
        ManagedUserSortField::Balance => query.order_by(user::Column::BalanceMicrousd, order),
        ManagedUserSortField::LastActive => {
            query.order_by_with_nulls(user::Column::LastActiveAt, order, NullOrdering::Last)
        }
        ManagedUserSortField::LastUsed => {
            query.order_by_with_nulls(last_used_at, order, NullOrdering::Last)
        }
        ManagedUserSortField::Created => query.order_by(user::Column::CreatedAt, order),
    }
    .order_by_desc(user::Column::Id)
}

fn last_used_at_expression() -> SimpleExpr {
    Expr::cust(
        "(SELECT MAX(api_keys.last_used_at) FROM api_keys WHERE api_keys.user_id = users.id)",
    )
}

fn managed_user_from_row(row: ManagedUserRow) -> Result<ManagedUser, RepositoryError> {
    Ok(ManagedUser {
        id: row.id,
        email: row.email,
        username: row.username,
        notes: row.notes,
        role: AccountRole::from_database(&row.role).ok_or_else(|| {
            RepositoryError::InvalidData(format!("unknown user role `{}`", row.role))
        })?,
        status: AccountStatus::from_database(&row.status).ok_or_else(|| {
            RepositoryError::InvalidData(format!("unknown user status `{}`", row.status))
        })?,
        balance_microusd: row.balance_microusd,
        concurrency_limit: row.concurrency_limit,
        rpm_limit: row.rpm_limit,
        last_login_at: row.last_login_at.map(domain_timestamp).transpose()?,
        last_login_ip: row
            .last_login_ip
            .map(|last_login_ip| last_login_ip.ip().to_string()),
        last_active_at: row.last_active_at.map(domain_timestamp).transpose()?,
        last_used_at: row.last_used_at.map(domain_timestamp).transpose()?,
        created_at: domain_timestamp(row.created_at)?,
    })
}

fn managed_user_balance_adjustment_from_row(
    row: ManagedUserBalanceAdjustmentRow,
) -> Result<ManagedUserBalanceAdjustment, RepositoryError> {
    Ok(ManagedUserBalanceAdjustment {
        id: row.id,
        user_id: row.user_id,
        operator_user_id: row.operator_user_id,
        adjustment_type: ManagedUserBalanceAdjustmentKind::from_database(&row.adjustment_type)
            .ok_or_else(|| {
                RepositoryError::InvalidData(format!(
                    "unknown user balance adjustment type `{}`",
                    row.adjustment_type
                ))
            })?,
        amount_microusd: row.amount_microusd,
        balance_after_microusd: row.balance_after_microusd,
        notes: row.notes,
        created_at: domain_timestamp(row.created_at)?,
    })
}

fn map_write_user_error(error: DbErr) -> RepositoryError {
    if database_constraint(&error) == Some("users_email_key") {
        return RepositoryError::Conflict(RepositoryConflict::UserEmail);
    }

    RepositoryError::Database(error)
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_user_management.rs"]
mod tests;

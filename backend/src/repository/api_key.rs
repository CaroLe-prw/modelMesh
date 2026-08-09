use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Select, Set,
    sea_query::{Expr, LikeExpr, extension::postgres::PgExpr},
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{ApiKey, ApiKeyId, ApiKeyStatus, Page, Pagination, UserId},
    entity::api_key,
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct ApiKeyRepository {
    database: DatabaseConnection,
}

pub struct ApiKeySearch {
    pub exact_key_hash: Option<String>,
    pub pattern: Option<String>,
    pub status: Option<ApiKeyStatus>,
}

pub struct NewApiKeyRecord {
    pub id: ApiKeyId,
    pub user_id: UserId,
    pub name: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub key_suffix: String,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_microusd: i64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_microusd: i64,
    pub daily_limit_microusd: i64,
    pub weekly_limit_microusd: i64,
    pub expires_at: Option<Timestamp>,
}

pub struct UpdateApiKeyRecord {
    pub name: String,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_microusd: i64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_microusd: i64,
    pub daily_limit_microusd: i64,
    pub weekly_limit_microusd: i64,
    pub expires_at: Option<Timestamp>,
}

impl ApiKeyRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_by_user(
        &self,
        user_id: UserId,
        search: &ApiKeySearch,
        pagination: Pagination,
    ) -> Result<Page<ApiKey>, RepositoryError> {
        let paginator = api_key_list_query(user_id, search)
            .paginate(&self.database, u64::from(pagination.page_size()));
        let total = paginator.num_items().await?;
        let api_keys = paginator
            .fetch_page(u64::from(pagination.page_index()))
            .await?
            .into_iter()
            .map(api_key_from_model)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(api_keys, pagination, total))
    }

    pub async fn create(&self, new_api_key: NewApiKeyRecord) -> Result<ApiKey, RepositoryError> {
        let api_key = api_key::ActiveModel {
            id: Set(Uuid::parse_str(&new_api_key.id).map_err(invalid_data)?),
            user_id: Set(new_api_key.user_id),
            name: Set(new_api_key.name),
            key_hash: Set(new_api_key.key_hash),
            key_prefix: Set(new_api_key.key_prefix),
            key_suffix: Set(new_api_key.key_suffix),
            ip_restriction_enabled: Set(new_api_key.ip_restriction_enabled),
            ip_whitelist: Set(new_api_key.ip_whitelist),
            ip_blacklist: Set(new_api_key.ip_blacklist),
            quota_limit_microusd: Set(new_api_key.quota_limit_microusd),
            rate_limit_enabled: Set(new_api_key.rate_limit_enabled),
            five_hour_limit_microusd: Set(new_api_key.five_hour_limit_microusd),
            daily_limit_microusd: Set(new_api_key.daily_limit_microusd),
            weekly_limit_microusd: Set(new_api_key.weekly_limit_microusd),
            expires_at: Set(new_api_key.expires_at.map(database_timestamp).transpose()?),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_api_key_write_error)?;

        api_key_from_model(api_key)
    }

    pub async fn update(
        &self,
        user_id: UserId,
        api_key_id: &str,
        update: UpdateApiKeyRecord,
    ) -> Result<Option<ApiKey>, RepositoryError> {
        let api_key_id = Uuid::parse_str(api_key_id).map_err(invalid_data)?;
        let updated = api_key::Entity::update_many()
            .set(api_key::ActiveModel {
                name: Set(update.name),
                ip_restriction_enabled: Set(update.ip_restriction_enabled),
                ip_whitelist: Set(update.ip_whitelist),
                ip_blacklist: Set(update.ip_blacklist),
                quota_limit_microusd: Set(update.quota_limit_microusd),
                rate_limit_enabled: Set(update.rate_limit_enabled),
                five_hour_limit_microusd: Set(update.five_hour_limit_microusd),
                daily_limit_microusd: Set(update.daily_limit_microusd),
                weekly_limit_microusd: Set(update.weekly_limit_microusd),
                expires_at: Set(update.expires_at.map(database_timestamp).transpose()?),
                ..Default::default()
            })
            .col_expr(api_key::Column::UpdatedAt, Expr::current_timestamp())
            .filter(api_key::Column::UserId.eq(user_id))
            .filter(api_key::Column::Id.eq(api_key_id))
            .exec_with_returning(&self.database)
            .await
            .map_err(map_api_key_write_error)?
            .into_iter()
            .next();

        updated.map(api_key_from_model).transpose()
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        api_key_id: &str,
        status: ApiKeyStatus,
    ) -> Result<Option<ApiKey>, RepositoryError> {
        let api_key_id = Uuid::parse_str(api_key_id).map_err(invalid_data)?;
        let updated = api_key::Entity::update_many()
            .set(api_key::ActiveModel {
                status: Set(status.as_str().to_owned()),
                ..Default::default()
            })
            .col_expr(api_key::Column::UpdatedAt, Expr::current_timestamp())
            .filter(api_key::Column::UserId.eq(user_id))
            .filter(api_key::Column::Id.eq(api_key_id))
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next();

        updated.map(api_key_from_model).transpose()
    }

    pub async fn delete(&self, user_id: UserId, api_key_id: &str) -> Result<bool, RepositoryError> {
        let api_key_id = Uuid::parse_str(api_key_id).map_err(invalid_data)?;
        let result = api_key::Entity::delete_many()
            .filter(api_key::Column::UserId.eq(user_id))
            .filter(api_key::Column::Id.eq(api_key_id))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected == 1)
    }
}

fn api_key_list_query(user_id: UserId, search: &ApiKeySearch) -> Select<api_key::Entity> {
    let mut query = api_key::Entity::find().filter(api_key::Column::UserId.eq(user_id));

    if let Some(pattern) = search.pattern.as_deref() {
        let like = LikeExpr::new(pattern).escape('\\');
        let masked_key = Expr::col(api_key::Column::KeyPrefix)
            .concat("••••")
            .concat(Expr::col(api_key::Column::KeySuffix));
        let mut search_condition = Condition::any()
            .add(Expr::col(api_key::Column::Name).ilike(like.clone()))
            .add(Expr::col(api_key::Column::KeyPrefix).ilike(like.clone()))
            .add(Expr::col(api_key::Column::KeySuffix).ilike(like.clone()))
            .add(masked_key.ilike(like));

        if let Some(exact_key_hash) = search.exact_key_hash.as_deref() {
            search_condition = search_condition.add(api_key::Column::KeyHash.eq(exact_key_hash));
        }

        query = query.filter(search_condition);
    } else if let Some(exact_key_hash) = search.exact_key_hash.as_deref() {
        query = query.filter(api_key::Column::KeyHash.eq(exact_key_hash));
    }

    if let Some(status) = search.status {
        query = query.filter(api_key::Column::Status.eq(status.as_str()));
    }

    query
        .order_by_desc(api_key::Column::CreatedAt)
        .order_by_desc(api_key::Column::Id)
}

fn api_key_from_model(model: api_key::Model) -> Result<ApiKey, RepositoryError> {
    let status = match model.status.as_str() {
        "active" => ApiKeyStatus::Active,
        "paused" => ApiKeyStatus::Paused,
        value => {
            return Err(RepositoryError::InvalidData(format!(
                "invalid API key status: {value}"
            )));
        }
    };

    Ok(ApiKey {
        id: model.id.hyphenated().to_string(),
        name: model.name,
        key_prefix: model.key_prefix,
        key_suffix: model.key_suffix,
        status,
        ip_restriction_enabled: model.ip_restriction_enabled,
        ip_whitelist: model.ip_whitelist,
        ip_blacklist: model.ip_blacklist,
        quota_limit_microusd: model.quota_limit_microusd,
        rate_limit_enabled: model.rate_limit_enabled,
        five_hour_limit_microusd: model.five_hour_limit_microusd,
        daily_limit_microusd: model.daily_limit_microusd,
        weekly_limit_microusd: model.weekly_limit_microusd,
        expires_at: model.expires_at.map(domain_timestamp).transpose()?,
        last_used_at: model.last_used_at.map(domain_timestamp).transpose()?,
        last_used_ip: model
            .last_used_ip
            .map(|last_used_ip| last_used_ip.ip().to_string()),
        created_at: domain_timestamp(model.created_at)?,
    })
}

fn map_api_key_write_error(error: DbErr) -> RepositoryError {
    match database_constraint(&error) {
        Some("api_keys_user_name_unique") => {
            RepositoryError::Conflict(RepositoryConflict::ApiKeyName)
        }
        Some("api_keys_key_hash_key") => RepositoryError::Conflict(RepositoryConflict::ApiKeyValue),
        _ => RepositoryError::Database(error),
    }
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32).map_err(invalid_data)
}

fn database_timestamp(value: Timestamp) -> Result<OffsetDateTime, RepositoryError> {
    let nanoseconds =
        i128::from(value.as_second()) * 1_000_000_000 + i128::from(value.subsec_nanosecond());

    OffsetDateTime::from_unix_timestamp_nanos(nanoseconds).map_err(invalid_data)
}

#[cfg(test)]
#[path = "../../tests/unit/repository_api_key.rs"]
mod tests;

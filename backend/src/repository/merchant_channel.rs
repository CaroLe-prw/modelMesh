use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, ModelTrait, QueryFilter,
    QueryOrder, Select, Set, TransactionTrait, sea_query::Expr,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{MerchantChannel, MerchantChannelStatus, MerchantOperationAudit, UserId},
    entity::{brand, merchant_channel},
};

use super::{
    RepositoryConflict, RepositoryError, database_constraint, set_merchant_operation_context,
};

#[derive(Clone)]
pub struct MerchantChannelRepository {
    database: DatabaseConnection,
}

pub struct NewMerchantChannelRecord {
    pub api_key_ciphertext: String,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub id: String,
    pub merchant_user_id: UserId,
    pub name: String,
    pub provider_id: String,
    pub supported_models: Vec<String>,
}

pub struct UpdateMerchantChannelRecord {
    pub api_key_ciphertext: String,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatus,
    pub submit_for_review: bool,
    pub supported_models: Vec<String>,
}

impl MerchantChannelRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_by_user(
        &self,
        user_id: UserId,
    ) -> Result<Vec<MerchantChannel>, RepositoryError> {
        merchant_channel_list_query(user_id)
            .find_also_related(brand::Entity)
            .all(&self.database)
            .await?
            .into_iter()
            .map(merchant_channel_from_models)
            .collect()
    }

    pub async fn find_by_user_and_id(
        &self,
        user_id: UserId,
        channel_id: &str,
    ) -> Result<Option<MerchantChannel>, RepositoryError> {
        let channel_id = Uuid::parse_str(channel_id).map_err(invalid_data)?;
        merchant_channel::Entity::find()
            .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
            .filter(merchant_channel::Column::Id.eq(channel_id))
            .find_also_related(brand::Entity)
            .one(&self.database)
            .await?
            .map(merchant_channel_from_models)
            .transpose()
    }

    pub async fn create(
        &self,
        record: NewMerchantChannelRecord,
    ) -> Result<MerchantChannel, RepositoryError> {
        let model_count = i64::try_from(record.supported_models.len()).map_err(invalid_data)?;
        let available_models =
            serde_json::to_value(record.available_models).map_err(invalid_data)?;
        let supported_models =
            serde_json::to_value(record.supported_models).map_err(invalid_data)?;
        let channel = merchant_channel::ActiveModel {
            id: Set(Uuid::parse_str(&record.id).map_err(invalid_data)?),
            merchant_user_id: Set(record.merchant_user_id),
            name: Set(record.name),
            provider_identifier: Set(record.provider_id),
            available_models: Set(available_models),
            base_url: Set(record.base_url),
            api_key_ciphertext: Set(record.api_key_ciphertext),
            description: Set(record.description),
            supported_models: Set(supported_models),
            status: Set(MerchantChannelStatus::Pending.as_str().to_owned()),
            review_action: Set("publish".to_owned()),
            model_count: Set(model_count),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_merchant_channel_write_error)?;

        let provider = channel
            .find_related(brand::Entity)
            .one(&self.database)
            .await?;
        merchant_channel_from_models((channel, provider))
    }

    pub async fn update(
        &self,
        user_id: UserId,
        channel_id: &str,
        record: UpdateMerchantChannelRecord,
    ) -> Result<Option<MerchantChannel>, RepositoryError> {
        let channel_id = Uuid::parse_str(channel_id).map_err(invalid_data)?;
        let model_count = i64::try_from(record.supported_models.len()).map_err(invalid_data)?;
        let available_models =
            serde_json::to_value(record.available_models).map_err(invalid_data)?;
        let supported_models =
            serde_json::to_value(record.supported_models).map_err(invalid_data)?;
        let mut changes = merchant_channel::ActiveModel {
            name: Set(record.name),
            provider_identifier: Set(record.provider_id),
            available_models: Set(available_models),
            base_url: Set(record.base_url),
            api_key_ciphertext: Set(record.api_key_ciphertext),
            description: Set(record.description),
            supported_models: Set(supported_models),
            status: Set(record.status.as_str().to_owned()),
            model_count: Set(model_count),
            ..Default::default()
        };
        if record.submit_for_review {
            changes.status = Set(MerchantChannelStatus::Pending.as_str().to_owned());
            changes.review_action = Set("publish".to_owned());
            changes.review_note = Set(String::new());
        }
        let update = merchant_channel::Entity::update_many()
            .set(changes)
            .col_expr(
                merchant_channel::Column::UpdatedAt,
                Expr::current_timestamp(),
            );
        let update = if record.submit_for_review {
            update.col_expr(
                merchant_channel::Column::ReviewSubmittedAt,
                Expr::current_timestamp(),
            )
        } else {
            update
        };
        let updated = update
            .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
            .filter(merchant_channel::Column::Id.eq(channel_id))
            .exec_with_returning(&self.database)
            .await
            .map_err(map_merchant_channel_write_error)?
            .into_iter()
            .next();

        let Some(channel) = updated else {
            return Ok(None);
        };
        let provider = channel
            .find_related(brand::Entity)
            .one(&self.database)
            .await?;

        merchant_channel_from_models((channel, provider)).map(Some)
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        channel_id: &str,
        status: MerchantChannelStatus,
        audit: &MerchantOperationAudit,
    ) -> Result<Option<MerchantChannel>, RepositoryError> {
        let channel_id = Uuid::parse_str(channel_id).map_err(invalid_data)?;
        let transaction = self.database.begin().await?;
        set_merchant_operation_context(&transaction, audit).await?;
        let updated = merchant_channel_status_update(user_id, channel_id, status)
            .exec_with_returning(&transaction)
            .await?
            .into_iter()
            .next();
        transaction.commit().await?;
        let Some(channel) = updated else {
            return Ok(None);
        };
        let provider = channel
            .find_related(brand::Entity)
            .one(&self.database)
            .await?;

        merchant_channel_from_models((channel, provider)).map(Some)
    }

    pub async fn delete(&self, user_id: UserId, channel_id: &str) -> Result<bool, RepositoryError> {
        let channel_id = Uuid::parse_str(channel_id).map_err(invalid_data)?;
        let result = merchant_channel::Entity::delete_many()
            .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
            .filter(merchant_channel::Column::Id.eq(channel_id))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected == 1)
    }
}

fn merchant_channel_list_query(user_id: UserId) -> Select<merchant_channel::Entity> {
    merchant_channel::Entity::find()
        .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
        .order_by_desc(merchant_channel::Column::UpdatedAt)
        .order_by_desc(merchant_channel::Column::Id)
}

fn merchant_channel_status_update(
    user_id: UserId,
    channel_id: Uuid,
    status: MerchantChannelStatus,
) -> sea_orm::UpdateMany<merchant_channel::Entity> {
    merchant_channel::Entity::update_many()
        .set(merchant_channel::ActiveModel {
            status: Set(status.as_str().to_owned()),
            ..Default::default()
        })
        .col_expr(
            merchant_channel::Column::UpdatedAt,
            Expr::current_timestamp(),
        )
        .filter(merchant_channel::Column::MerchantUserId.eq(user_id))
        .filter(merchant_channel::Column::Id.eq(channel_id))
}

fn merchant_channel_from_models(
    (model, provider): (merchant_channel::Model, Option<brand::Model>),
) -> Result<MerchantChannel, RepositoryError> {
    let provider = provider.ok_or_else(|| {
        RepositoryError::InvalidData(format!(
            "merchant channel references missing provider: {}",
            model.provider_identifier
        ))
    })?;
    let status = match model.status.as_str() {
        "active" => MerchantChannelStatus::Active,
        "offline" => MerchantChannelStatus::Offline,
        "pending" => MerchantChannelStatus::Pending,
        "rejected" => MerchantChannelStatus::Rejected,
        value => {
            return Err(RepositoryError::InvalidData(format!(
                "invalid merchant channel status: {value}"
            )));
        }
    };
    let available_models = serde_json::from_value::<Vec<String>>(model.available_models.clone())
        .map_err(invalid_data)?;
    let supported_models = serde_json::from_value::<Vec<String>>(model.supported_models.clone())
        .map_err(invalid_data)?;

    Ok(MerchantChannel {
        api_key_ciphertext: model.api_key_ciphertext,
        available_models,
        base_url: model.base_url,
        description: model.description,
        id: model.id.hyphenated().to_string(),
        public_id: model.public_id,
        name: model.name,
        provider_id: provider.identifier,
        provider: provider.name,
        status,
        supported_models,
        review_note: model.review_note,
        model_count: u64::try_from(model.model_count).map_err(invalid_data)?,
        success_rate_basis_points: u32::try_from(model.success_rate_basis_points)
            .map_err(invalid_data)?,
        average_latency_ms: u64::try_from(model.average_latency_ms).map_err(invalid_data)?,
        created_at: domain_timestamp(model.created_at)?,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn map_merchant_channel_write_error(error: DbErr) -> RepositoryError {
    match database_constraint(&error) {
        Some("merchant_channels_user_name_unique") => {
            RepositoryError::Conflict(RepositoryConflict::MerchantChannelName)
        }
        _ => RepositoryError::Database(error),
    }
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32).map_err(invalid_data)
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_channel.rs"]
mod tests;

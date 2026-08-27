use uuid::Uuid;

use crate::{
    domain::{AccountRole, MerchantChannel, MerchantChannelStatus, UserId},
    repository::{
        BrandRepository, MerchantChannelRepository, NewMerchantChannelRecord, RepositoryConflict,
        RepositoryError, UpdateMerchantChannelRecord,
    },
};

use super::authorization::require_merchant;

#[derive(Clone)]
pub struct MerchantChannelService {
    repository: MerchantChannelRepository,
    brand_repository: BrandRepository,
}

pub struct CreateMerchantChannel {
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatus,
}

pub struct UpdateMerchantChannel {
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatus,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantChannelServiceError {
    Forbidden,
    InvalidInput,
    NameAlreadyExists,
    NotFound,
    Internal,
}

impl MerchantChannelService {
    pub fn new(repository: MerchantChannelRepository, brand_repository: BrandRepository) -> Self {
        Self {
            repository,
            brand_repository,
        }
    }

    pub async fn list(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
    ) -> Result<Vec<MerchantChannel>, MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        self.repository
            .list_by_user(user_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, "merchant channel list failed");
                MerchantChannelServiceError::Internal
            })
    }

    pub async fn create(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        request: CreateMerchantChannel,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        let name = normalize_name(request.name)?;
        let provider_id = normalize_provider_id(request.provider_id)?;
        self.require_active_provider(&provider_id, user_id).await?;

        self.repository
            .create(NewMerchantChannelRecord {
                id: Uuid::new_v4().hyphenated().to_string(),
                merchant_user_id: user_id,
                name,
                provider_id,
                status: request.status,
            })
            .await
            .map_err(|error| map_write_error(error, user_id, "create"))
    }

    pub async fn update(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        channel_id: &str,
        request: UpdateMerchantChannel,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        validate_channel_id(channel_id)?;
        let name = normalize_name(request.name)?;
        let provider_id = normalize_provider_id(request.provider_id)?;
        let current = self
            .repository
            .find_by_user_and_id(user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, "merchant channel lookup failed");
                MerchantChannelServiceError::Internal
            })?
            .ok_or(MerchantChannelServiceError::NotFound)?;
        if provider_id != current.provider_id {
            self.require_active_provider(&provider_id, user_id).await?;
        }

        self.repository
            .update(
                user_id,
                channel_id,
                UpdateMerchantChannelRecord {
                    name,
                    provider_id,
                    status: request.status,
                },
            )
            .await
            .map_err(|error| map_write_error(error, user_id, "update"))?
            .ok_or(MerchantChannelServiceError::NotFound)
    }

    pub async fn delete(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        channel_id: &str,
    ) -> Result<(), MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        validate_channel_id(channel_id)?;
        let deleted = self
            .repository
            .delete(user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, "merchant channel deletion failed");
                MerchantChannelServiceError::Internal
            })?;

        deleted
            .then_some(())
            .ok_or(MerchantChannelServiceError::NotFound)
    }

    async fn require_active_provider(
        &self,
        provider_id: &str,
        user_id: UserId,
    ) -> Result<(), MerchantChannelServiceError> {
        let active = self
            .brand_repository
            .is_active_identifier(provider_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, provider_id, "channel provider lookup failed");
                MerchantChannelServiceError::Internal
            })?;

        active
            .then_some(())
            .ok_or(MerchantChannelServiceError::InvalidInput)
    }
}

fn normalize_name(value: String) -> Result<String, MerchantChannelServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty() && value.chars().count() <= 80 && !value.chars().any(char::is_control))
        .then_some(value)
        .ok_or(MerchantChannelServiceError::InvalidInput)
}

fn normalize_provider_id(value: String) -> Result<String, MerchantChannelServiceError> {
    let value = value.trim().to_ascii_lowercase();
    let valid = !value.is_empty()
        && value.len() <= 64
        && value
            .split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_alphanumeric()));

    valid
        .then_some(value)
        .ok_or(MerchantChannelServiceError::InvalidInput)
}

fn validate_channel_id(value: &str) -> Result<(), MerchantChannelServiceError> {
    Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| MerchantChannelServiceError::InvalidInput)
}

fn map_write_error(
    error: RepositoryError,
    user_id: UserId,
    operation: &'static str,
) -> MerchantChannelServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::MerchantChannelName)
    ) {
        return MerchantChannelServiceError::NameAlreadyExists;
    }

    tracing::error!(error = %error, user_id, operation, "merchant channel write failed");
    MerchantChannelServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_channel.rs"]
mod tests;

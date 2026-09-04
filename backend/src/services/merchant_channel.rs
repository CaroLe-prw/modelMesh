use uuid::Uuid;

use crate::{
    clients::{UpstreamModelsClient, UpstreamModelsClientError},
    domain::{
        AccountRole, MerchantChannel, MerchantChannelStatus, MerchantOperationAudit,
        MerchantOperationSource, UserId,
    },
    repository::{
        BrandRepository, MerchantChannelRepository, NewMerchantChannelRecord, RepositoryConflict,
        RepositoryError, UpdateMerchantChannelRecord,
    },
    security::CredentialCipher,
};

use super::{
    authorization::{require_admin, require_merchant},
    merchant_resource_operation::admin_operation_audit,
};

#[derive(Clone)]
pub struct MerchantChannelService {
    repository: MerchantChannelRepository,
    brand_repository: BrandRepository,
    credential_cipher: CredentialCipher,
    upstream_models_client: UpstreamModelsClient,
}

pub struct CreateMerchantChannel {
    pub api_key: String,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub name: String,
    pub provider_id: String,
    pub supported_models: Vec<String>,
}

pub struct UpdateMerchantChannel {
    pub api_key: Option<String>,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub name: String,
    pub provider_id: String,
    pub status: MerchantChannelStatus,
    pub supported_models: Vec<String>,
}

pub struct DiscoverMerchantChannelModels {
    pub api_key: Option<String>,
    pub base_url: String,
    pub channel_id: Option<String>,
    pub provider_id: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantChannelServiceError {
    Forbidden,
    InvalidInput,
    NameAlreadyExists,
    NotFound,
    PendingReview,
    ReviewFieldsLocked,
    ConnectionFailed,
    CredentialsRejected,
    Internal,
}

impl MerchantChannelService {
    pub fn new(
        repository: MerchantChannelRepository,
        brand_repository: BrandRepository,
        credential_cipher: CredentialCipher,
        upstream_models_client: UpstreamModelsClient,
    ) -> Self {
        Self {
            repository,
            brand_repository,
            credential_cipher,
            upstream_models_client,
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

    pub async fn list_for_admin(
        &self,
        requester_role: AccountRole,
        merchant_user_id: UserId,
    ) -> Result<Vec<MerchantChannel>, MerchantChannelServiceError> {
        require_admin(requester_role, MerchantChannelServiceError::Forbidden)?;
        if merchant_user_id <= 0 {
            return Err(MerchantChannelServiceError::InvalidInput);
        }
        self.repository
            .list_by_user(merchant_user_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, merchant_user_id, "admin merchant channel list failed");
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
        let channel_id = Uuid::new_v4().hyphenated().to_string();
        let name = normalize_name(request.name)?;
        let provider_id = normalize_provider_id(request.provider_id)?;
        let base_url = normalize_base_url(request.base_url)?;
        let api_key = normalize_api_key(request.api_key)?;
        let description = normalize_description(request.description)?;
        let supported_models = normalize_supported_models(request.supported_models)?;
        let available_models =
            normalize_available_models(request.available_models, &supported_models)?;
        self.require_active_provider(&provider_id, user_id).await?;
        let api_key_ciphertext = self
            .credential_cipher
            .encrypt(&api_key, &channel_id)
            .map_err(|_| MerchantChannelServiceError::Internal)?;

        self.repository
            .create(NewMerchantChannelRecord {
                api_key_ciphertext,
                available_models,
                base_url,
                description,
                id: channel_id,
                merchant_user_id: user_id,
                name,
                provider_id,
                supported_models,
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
        let base_url = normalize_base_url(request.base_url)?;
        let description = normalize_description(request.description)?;
        let supported_models = normalize_supported_models(request.supported_models)?;
        let available_models =
            normalize_available_models(request.available_models, &supported_models)?;
        let current = self
            .repository
            .find_by_user_and_id(user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, "merchant channel lookup failed");
                MerchantChannelServiceError::Internal
            })?
            .ok_or(MerchantChannelServiceError::NotFound)?;
        let review_fields_changed = name != current.name
            || provider_id != current.provider_id
            || description != current.description;
        let any_fields_changed = review_fields_changed
            || base_url != current.base_url
            || supported_models != current.supported_models
            || request.api_key.is_some();
        let (status, submit_for_review) = resolve_update_status(
            current.status,
            review_fields_changed,
            any_fields_changed,
            request.status,
        )?;
        if provider_id != current.provider_id {
            self.require_active_provider(&provider_id, user_id).await?;
        }
        let submitted_api_key = request.api_key.map(normalize_api_key).transpose()?;
        let api_key_ciphertext = match submitted_api_key {
            Some(api_key) => self
                .credential_cipher
                .encrypt(&api_key, channel_id)
                .map_err(|_| MerchantChannelServiceError::Internal)?,
            None if !current.api_key_ciphertext.is_empty() => current.api_key_ciphertext.clone(),
            None => return Err(MerchantChannelServiceError::InvalidInput),
        };

        self.repository
            .update(
                user_id,
                channel_id,
                UpdateMerchantChannelRecord {
                    api_key_ciphertext,
                    available_models,
                    base_url,
                    description,
                    name,
                    provider_id,
                    status,
                    submit_for_review,
                    supported_models,
                },
            )
            .await
            .map_err(|error| map_write_error(error, user_id, "update"))?
            .ok_or(MerchantChannelServiceError::NotFound)
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        channel_id: &str,
        requested_status: MerchantChannelStatus,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        let audit = MerchantOperationAudit {
            operator_user_id: user_id,
            source: MerchantOperationSource::Merchant,
            reason: String::new(),
        };
        self.update_status_with_audit(user_id, channel_id, requested_status, &audit)
            .await
    }

    async fn update_status_with_audit(
        &self,
        user_id: UserId,
        channel_id: &str,
        requested_status: MerchantChannelStatus,
        audit: &MerchantOperationAudit,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        validate_channel_id(channel_id)?;
        let current = self.find_channel(user_id, channel_id).await?;
        if !current.status.is_approved() {
            return Err(MerchantChannelServiceError::PendingReview);
        }

        self.repository
            .update_status(user_id, channel_id, requested_status, audit)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, channel_id, "merchant channel status update failed");
                MerchantChannelServiceError::Internal
            })?
            .ok_or(MerchantChannelServiceError::NotFound)
    }

    pub async fn update_status_for_admin(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        merchant_user_id: UserId,
        channel_id: &str,
        requested_status: MerchantChannelStatus,
        operation_reason: String,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        require_admin(requester_role, MerchantChannelServiceError::Forbidden)?;
        if merchant_user_id <= 0 {
            return Err(MerchantChannelServiceError::InvalidInput);
        }
        let audit = admin_operation_audit(
            requester_id,
            requested_status == MerchantChannelStatus::Offline,
            operation_reason,
        )
        .map_err(|()| MerchantChannelServiceError::InvalidInput)?;
        self.update_status_with_audit(merchant_user_id, channel_id, requested_status, &audit)
            .await
    }

    pub async fn discover_models(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        request: DiscoverMerchantChannelModels,
    ) -> Result<Vec<String>, MerchantChannelServiceError> {
        require_merchant(requester_role, MerchantChannelServiceError::Forbidden)?;
        let provider_id = normalize_provider_id(request.provider_id)?;
        let base_url = normalize_base_url(request.base_url)?;
        self.require_active_provider(&provider_id, user_id).await?;
        let api_key = match request.api_key.map(normalize_api_key).transpose()? {
            Some(api_key) => api_key,
            None => {
                let channel_id = request
                    .channel_id
                    .as_deref()
                    .ok_or(MerchantChannelServiceError::InvalidInput)?;
                validate_channel_id(channel_id)?;
                let current = self.find_channel(user_id, channel_id).await?;
                if current.provider_id != provider_id || current.api_key_ciphertext.is_empty() {
                    return Err(MerchantChannelServiceError::InvalidInput);
                }
                self.credential_cipher
                    .decrypt(&current.api_key_ciphertext, channel_id)
                    .map_err(|_| {
                        tracing::error!(
                            user_id,
                            channel_id,
                            "merchant channel credential decryption failed"
                        );
                        MerchantChannelServiceError::Internal
                    })?
            }
        };

        self.upstream_models_client
            .fetch_models(&base_url, &api_key, &provider_id)
            .await
            .map_err(|error| {
                tracing::warn!(
                    user_id,
                    provider_id,
                    error_kind = upstream_error_kind(error),
                    "merchant channel model discovery failed"
                );
                match error {
                    UpstreamModelsClientError::CredentialsRejected => {
                        MerchantChannelServiceError::CredentialsRejected
                    }
                    UpstreamModelsClientError::InvalidBaseUrl
                    | UpstreamModelsClientError::PrivateEndpoint => {
                        MerchantChannelServiceError::InvalidInput
                    }
                    UpstreamModelsClientError::InvalidResponse
                    | UpstreamModelsClientError::RequestFailed => {
                        MerchantChannelServiceError::ConnectionFailed
                    }
                }
            })
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

    async fn find_channel(
        &self,
        user_id: UserId,
        channel_id: &str,
    ) -> Result<MerchantChannel, MerchantChannelServiceError> {
        self.repository
            .find_by_user_and_id(user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, channel_id, "merchant channel lookup failed");
                MerchantChannelServiceError::Internal
            })?
            .ok_or(MerchantChannelServiceError::NotFound)
    }
}

fn resolve_update_status(
    current_status: MerchantChannelStatus,
    review_fields_changed: bool,
    any_fields_changed: bool,
    requested_status: MerchantChannelStatus,
) -> Result<(MerchantChannelStatus, bool), MerchantChannelServiceError> {
    match current_status {
        MerchantChannelStatus::Active | MerchantChannelStatus::Offline => {
            if review_fields_changed {
                return Err(MerchantChannelServiceError::ReviewFieldsLocked);
            }
            Ok((requested_status, false))
        }
        MerchantChannelStatus::Rejected => Ok((MerchantChannelStatus::Pending, true)),
        MerchantChannelStatus::Pending => Ok((MerchantChannelStatus::Pending, any_fields_changed)),
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

fn normalize_base_url(value: String) -> Result<String, MerchantChannelServiceError> {
    let value = value.trim();
    if value.is_empty() || value.len() > 2048 {
        return Err(MerchantChannelServiceError::InvalidInput);
    }
    let mut url =
        reqwest::Url::parse(value).map_err(|_| MerchantChannelServiceError::InvalidInput)?;
    let host = url
        .host_str()
        .ok_or(MerchantChannelServiceError::InvalidInput)?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || host.eq_ignore_ascii_case("localhost")
        || host.to_ascii_lowercase().ends_with(".localhost")
    {
        return Err(MerchantChannelServiceError::InvalidInput);
    }
    let normalized_path = url.path().trim_end_matches('/').to_owned();
    url.set_path(&normalized_path);
    Ok(url.to_string().trim_end_matches('/').to_owned())
}

fn normalize_api_key(value: String) -> Result<String, MerchantChannelServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty() && value.len() <= 4096 && !value.chars().any(char::is_control))
        .then_some(value)
        .ok_or(MerchantChannelServiceError::InvalidInput)
}

fn normalize_description(value: String) -> Result<String, MerchantChannelServiceError> {
    let value = value.trim().to_owned();
    (value.chars().count() <= 500 && !value.chars().any(char::is_control))
        .then_some(value)
        .ok_or(MerchantChannelServiceError::InvalidInput)
}

fn normalize_supported_models(
    values: Vec<String>,
) -> Result<Vec<String>, MerchantChannelServiceError> {
    normalize_models(values, true)
}

fn normalize_available_models(
    mut values: Vec<String>,
    supported_models: &[String],
) -> Result<Vec<String>, MerchantChannelServiceError> {
    values.extend_from_slice(supported_models);
    normalize_models(values, true)
}

fn normalize_models(
    values: Vec<String>,
    required: bool,
) -> Result<Vec<String>, MerchantChannelServiceError> {
    let mut values = values
        .into_iter()
        .map(|value| value.trim().to_owned())
        .collect::<Vec<_>>();
    if values.iter().any(|value| {
        value.is_empty() || value.chars().count() > 200 || value.chars().any(char::is_control)
    }) {
        return Err(MerchantChannelServiceError::InvalidInput);
    }
    values.sort_unstable();
    values.dedup();
    if (required && values.is_empty()) || values.len() > 2000 {
        return Err(MerchantChannelServiceError::InvalidInput);
    }
    Ok(values)
}

const fn upstream_error_kind(error: UpstreamModelsClientError) -> &'static str {
    match error {
        UpstreamModelsClientError::CredentialsRejected => "credentials_rejected",
        UpstreamModelsClientError::InvalidBaseUrl => "invalid_base_url",
        UpstreamModelsClientError::InvalidResponse => "invalid_response",
        UpstreamModelsClientError::PrivateEndpoint => "private_endpoint",
        UpstreamModelsClientError::RequestFailed => "request_failed",
    }
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

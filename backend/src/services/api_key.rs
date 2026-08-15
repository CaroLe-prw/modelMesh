use std::net::IpAddr;

use jiff::Timestamp;
use uuid::Uuid;

use crate::{
    domain::{AccountRole, ApiKey, ApiKeyStatus, Page, Pagination, UserId},
    repository::{
        ApiKeyRepository, ApiKeySearch, NewApiKeyRecord, RepositoryConflict, RepositoryError,
        UpdateApiKeyRecord,
    },
    security::hash_secret,
};

use super::authorization::require_admin;

const API_KEY_GENERATION_ATTEMPTS: usize = 3;
const MAX_IP_RULES_LENGTH: usize = 8_192;
const MAX_MONEY_MICROUSD: i64 = 9_000_000_000_000_000;
const MAX_SEARCH_QUERY_LENGTH: usize = 256;

#[derive(Clone)]
pub struct ApiKeyService {
    repository: ApiKeyRepository,
}

pub struct CreateApiKey {
    pub name: String,
    pub custom_key: Option<String>,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_usd: f64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub expires_at: Option<String>,
}

pub struct UpdateApiKey {
    pub name: String,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_usd: f64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub expires_at: Option<String>,
}

pub struct CreatedApiKey {
    pub api_key: ApiKey,
    pub plain_text_key: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApiKeyServiceError {
    Forbidden,
    InvalidInput,
    NameAlreadyExists,
    KeyAlreadyExists,
    NotFound,
    Internal,
}

struct ValidatedSettings {
    name: String,
    ip_restriction_enabled: bool,
    ip_whitelist: String,
    ip_blacklist: String,
    quota_limit_microusd: i64,
    rate_limit_enabled: bool,
    five_hour_limit_microusd: i64,
    daily_limit_microusd: i64,
    weekly_limit_microusd: i64,
    expires_at: Option<Timestamp>,
}

impl ApiKeyService {
    pub fn new(repository: ApiKeyRepository) -> Self {
        Self { repository }
    }

    pub async fn list(
        &self,
        user_id: UserId,
        pagination: Pagination,
        query: Option<String>,
        status: Option<ApiKeyStatus>,
    ) -> Result<Page<ApiKey>, ApiKeyServiceError> {
        let mut search = build_search(query)?;
        search.status = status;
        self.repository
            .list_by_user(user_id, &search, pagination)
            .await
            .map_err(|_| ApiKeyServiceError::Internal)
    }

    pub async fn list_for_admin(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
        pagination: Pagination,
        query: Option<String>,
        status: Option<ApiKeyStatus>,
    ) -> Result<Page<ApiKey>, ApiKeyServiceError> {
        require_admin(requester_role, ApiKeyServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(ApiKeyServiceError::InvalidInput);
        }

        self.list(user_id, pagination, query, status).await
    }

    pub async fn create(
        &self,
        user_id: UserId,
        request: CreateApiKey,
    ) -> Result<CreatedApiKey, ApiKeyServiceError> {
        let settings = validate_settings(
            request.name,
            request.ip_restriction_enabled,
            request.ip_whitelist,
            request.ip_blacklist,
            request.quota_limit_usd,
            request.rate_limit_enabled,
            request.five_hour_limit_usd,
            request.daily_limit_usd,
            request.weekly_limit_usd,
            request.expires_at,
        )?;
        let custom_key = request.custom_key.map(validate_custom_key).transpose()?;

        for _ in 0..API_KEY_GENERATION_ATTEMPTS {
            let plain_text_key = custom_key.clone().unwrap_or_else(generate_api_key);
            let record = new_api_key_record(user_id, &plain_text_key, &settings);

            match self.repository.create(record).await {
                Ok(api_key) => {
                    return Ok(CreatedApiKey {
                        api_key,
                        plain_text_key,
                    });
                }
                Err(error) if is_name_conflict(&error) => {
                    return Err(ApiKeyServiceError::NameAlreadyExists);
                }
                Err(error) if is_key_conflict(&error) && custom_key.is_some() => {
                    return Err(ApiKeyServiceError::KeyAlreadyExists);
                }
                Err(error) if is_key_conflict(&error) => continue,
                Err(_) => return Err(ApiKeyServiceError::Internal),
            }
        }

        Err(ApiKeyServiceError::Internal)
    }

    pub async fn update(
        &self,
        user_id: UserId,
        api_key_id: &str,
        request: UpdateApiKey,
    ) -> Result<ApiKey, ApiKeyServiceError> {
        validate_api_key_id(api_key_id)?;
        let settings = validate_settings(
            request.name,
            request.ip_restriction_enabled,
            request.ip_whitelist,
            request.ip_blacklist,
            request.quota_limit_usd,
            request.rate_limit_enabled,
            request.five_hour_limit_usd,
            request.daily_limit_usd,
            request.weekly_limit_usd,
            request.expires_at,
        )?;
        let record = UpdateApiKeyRecord {
            name: settings.name,
            ip_restriction_enabled: settings.ip_restriction_enabled,
            ip_whitelist: settings.ip_whitelist,
            ip_blacklist: settings.ip_blacklist,
            quota_limit_microusd: settings.quota_limit_microusd,
            rate_limit_enabled: settings.rate_limit_enabled,
            five_hour_limit_microusd: settings.five_hour_limit_microusd,
            daily_limit_microusd: settings.daily_limit_microusd,
            weekly_limit_microusd: settings.weekly_limit_microusd,
            expires_at: settings.expires_at,
        };

        self.repository
            .update(user_id, api_key_id, record)
            .await
            .map_err(|error| {
                if is_name_conflict(&error) {
                    ApiKeyServiceError::NameAlreadyExists
                } else {
                    ApiKeyServiceError::Internal
                }
            })?
            .ok_or(ApiKeyServiceError::NotFound)
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        api_key_id: &str,
        status: ApiKeyStatus,
    ) -> Result<ApiKey, ApiKeyServiceError> {
        validate_api_key_id(api_key_id)?;
        self.repository
            .update_status(user_id, api_key_id, status)
            .await
            .map_err(|_| ApiKeyServiceError::Internal)?
            .ok_or(ApiKeyServiceError::NotFound)
    }

    pub async fn delete(
        &self,
        user_id: UserId,
        api_key_id: &str,
    ) -> Result<(), ApiKeyServiceError> {
        validate_api_key_id(api_key_id)?;
        let deleted = self
            .repository
            .delete(user_id, api_key_id)
            .await
            .map_err(|_| ApiKeyServiceError::Internal)?;

        if deleted {
            Ok(())
        } else {
            Err(ApiKeyServiceError::NotFound)
        }
    }
}

fn build_search(query: Option<String>) -> Result<ApiKeySearch, ApiKeyServiceError> {
    let Some(query) = query else {
        return Ok(ApiKeySearch {
            exact_key_hash: None,
            pattern: None,
            status: None,
        });
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(ApiKeySearch {
            exact_key_hash: None,
            pattern: None,
            status: None,
        });
    }
    if query.chars().count() > MAX_SEARCH_QUERY_LENGTH || query.chars().any(char::is_control) {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    Ok(ApiKeySearch {
        exact_key_hash: Some(hash_secret(query)),
        pattern: Some(format!("%{}%", escape_like_pattern(query))),
        status: None,
    })
}

fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

fn validate_settings(
    name: String,
    ip_restriction_enabled: bool,
    ip_whitelist: String,
    ip_blacklist: String,
    quota_limit_usd: f64,
    rate_limit_enabled: bool,
    five_hour_limit_usd: f64,
    daily_limit_usd: f64,
    weekly_limit_usd: f64,
    expires_at: Option<String>,
) -> Result<ValidatedSettings, ApiKeyServiceError> {
    let name = name.trim().to_owned();
    if name.is_empty() || name.chars().count() > 48 || name.chars().any(char::is_control) {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    let (ip_whitelist, ip_blacklist) = if ip_restriction_enabled {
        (
            normalize_ip_rules(&ip_whitelist)?,
            normalize_ip_rules(&ip_blacklist)?,
        )
    } else {
        (String::new(), String::new())
    };
    let expires_at = expires_at.map(validate_expiration).transpose()?;

    Ok(ValidatedSettings {
        name,
        ip_restriction_enabled,
        ip_whitelist,
        ip_blacklist,
        quota_limit_microusd: usd_to_microusd(quota_limit_usd)?,
        rate_limit_enabled,
        five_hour_limit_microusd: if rate_limit_enabled {
            usd_to_microusd(five_hour_limit_usd)?
        } else {
            0
        },
        daily_limit_microusd: if rate_limit_enabled {
            usd_to_microusd(daily_limit_usd)?
        } else {
            0
        },
        weekly_limit_microusd: if rate_limit_enabled {
            usd_to_microusd(weekly_limit_usd)?
        } else {
            0
        },
        expires_at,
    })
}

fn validate_custom_key(value: String) -> Result<String, ApiKeyServiceError> {
    let value = value.trim().to_owned();
    if !(16..=256).contains(&value.len())
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
    {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    Ok(value)
}

fn normalize_ip_rules(value: &str) -> Result<String, ApiKeyServiceError> {
    if value.len() > MAX_IP_RULES_LENGTH {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    let mut normalized = Vec::new();
    for rule in value.lines().map(str::trim).filter(|rule| !rule.is_empty()) {
        validate_ip_rule(rule)?;
        normalized.push(rule);
    }

    Ok(normalized.join("\n"))
}

fn validate_ip_rule(rule: &str) -> Result<(), ApiKeyServiceError> {
    if let Some((address, prefix)) = rule.split_once('/') {
        let address = address
            .parse::<IpAddr>()
            .map_err(|_| ApiKeyServiceError::InvalidInput)?;
        let prefix = prefix
            .parse::<u8>()
            .map_err(|_| ApiKeyServiceError::InvalidInput)?;
        let max_prefix = if address.is_ipv4() { 32 } else { 128 };

        if prefix > max_prefix {
            return Err(ApiKeyServiceError::InvalidInput);
        }
    } else {
        rule.parse::<IpAddr>()
            .map_err(|_| ApiKeyServiceError::InvalidInput)?;
    }

    Ok(())
}

fn validate_expiration(value: String) -> Result<Timestamp, ApiKeyServiceError> {
    let expiration = value
        .parse::<Timestamp>()
        .map_err(|_| ApiKeyServiceError::InvalidInput)?;
    if expiration <= Timestamp::now() {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    Ok(expiration)
}

fn usd_to_microusd(value: f64) -> Result<i64, ApiKeyServiceError> {
    let scaled = value * 1_000_000.0;
    if !scaled.is_finite() || scaled < 0.0 || scaled > MAX_MONEY_MICROUSD as f64 {
        return Err(ApiKeyServiceError::InvalidInput);
    }

    Ok(scaled.round() as i64)
}

fn validate_api_key_id(value: &str) -> Result<(), ApiKeyServiceError> {
    Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| ApiKeyServiceError::InvalidInput)
}

fn generate_api_key() -> String {
    format!("sk-{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn new_api_key_record(
    user_id: UserId,
    plain_text_key: &str,
    settings: &ValidatedSettings,
) -> NewApiKeyRecord {
    NewApiKeyRecord {
        id: Uuid::new_v4().hyphenated().to_string(),
        user_id,
        name: settings.name.clone(),
        key_hash: hash_secret(plain_text_key),
        key_prefix: plain_text_key[..7].to_owned(),
        key_suffix: plain_text_key[plain_text_key.len() - 4..].to_owned(),
        ip_restriction_enabled: settings.ip_restriction_enabled,
        ip_whitelist: settings.ip_whitelist.clone(),
        ip_blacklist: settings.ip_blacklist.clone(),
        quota_limit_microusd: settings.quota_limit_microusd,
        rate_limit_enabled: settings.rate_limit_enabled,
        five_hour_limit_microusd: settings.five_hour_limit_microusd,
        daily_limit_microusd: settings.daily_limit_microusd,
        weekly_limit_microusd: settings.weekly_limit_microusd,
        expires_at: settings.expires_at,
    }
}

fn is_name_conflict(error: &RepositoryError) -> bool {
    matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::ApiKeyName)
    )
}

fn is_key_conflict(error: &RepositoryError) -> bool {
    matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::ApiKeyValue)
    )
}

#[cfg(test)]
#[path = "../../tests/unit/services_api_key.rs"]
mod tests;

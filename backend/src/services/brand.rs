use crate::{
    domain::{AccountRole, Brand, BrandStatus},
    repository::{
        BrandPresetRepository, BrandRepository, BrandSearch, NewBrandRecord, RepositoryConflict,
        RepositoryError, UpdateBrandRecord,
    },
};

use super::authorization::require_admin;

const MAX_AVATAR_DATA_URL_LENGTH: usize = 2_796_300;
const MAX_SEARCH_QUERY_LENGTH: usize = 256;

#[derive(Clone)]
pub struct BrandService {
    repository: BrandRepository,
    preset_repository: BrandPresetRepository,
}

pub struct CreateBrand {
    pub identifier: String,
    pub name: String,
    pub preset_identifier: Option<String>,
    pub avatar_url: Option<String>,
    pub sort_order: i32,
    pub status: BrandStatus,
}

pub struct UpdateBrand {
    pub name: String,
    pub sort_order: i32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BrandServiceError {
    Forbidden,
    InvalidInput,
    AlreadyExists,
    PresetNotFound,
    NotFound,
    Internal,
}

impl BrandService {
    pub fn new(repository: BrandRepository, preset_repository: BrandPresetRepository) -> Self {
        Self {
            repository,
            preset_repository,
        }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        query: Option<String>,
        status: Option<BrandStatus>,
    ) -> Result<Vec<Brand>, BrandServiceError> {
        require_admin(requester_role, BrandServiceError::Forbidden)?;
        let search = BrandSearch {
            pattern: build_search_pattern(query)?,
            status,
        };

        self.repository.list(&search).await.map_err(|error| {
            tracing::error!(error = %error, "brand list failed");
            BrandServiceError::Internal
        })
    }

    pub async fn create(
        &self,
        requester_role: AccountRole,
        request: CreateBrand,
    ) -> Result<Brand, BrandServiceError> {
        require_admin(requester_role, BrandServiceError::Forbidden)?;
        let identifier = normalize_identifier(request.identifier)?;
        validate_sort_order(request.sort_order)?;

        let (name, preset_id, avatar_data_url) =
            if let Some(preset_identifier) = request.preset_identifier {
                let preset_identifier = normalize_identifier(preset_identifier)?;
                if preset_identifier != identifier || request.avatar_url.is_some() {
                    return Err(BrandServiceError::InvalidInput);
                }
                let preset = self
                    .preset_repository
                    .find_enabled(&preset_identifier)
                    .await
                    .map_err(|_| BrandServiceError::Internal)?
                    .ok_or(BrandServiceError::PresetNotFound)?;

                (preset.name, Some(preset.database_id), None)
            } else {
                if self
                    .preset_repository
                    .find_enabled(&identifier)
                    .await
                    .map_err(|_| BrandServiceError::Internal)?
                    .is_some()
                {
                    return Err(BrandServiceError::InvalidInput);
                }

                (
                    normalize_name(request.name)?,
                    None,
                    request
                        .avatar_url
                        .map(validate_avatar_data_url)
                        .transpose()?,
                )
            };

        self.repository
            .create(NewBrandRecord {
                identifier,
                name,
                preset_id,
                avatar_data_url,
                sort_order: request.sort_order,
                status: request.status,
            })
            .await
            .map_err(map_repository_write_error)
    }

    pub async fn update(
        &self,
        requester_role: AccountRole,
        identifier: String,
        request: UpdateBrand,
    ) -> Result<Brand, BrandServiceError> {
        require_admin(requester_role, BrandServiceError::Forbidden)?;
        let identifier = normalize_identifier(identifier)?;
        let name = normalize_name(request.name)?;
        validate_sort_order(request.sort_order)?;

        self.repository
            .update(
                &identifier,
                UpdateBrandRecord {
                    name,
                    sort_order: request.sort_order,
                },
            )
            .await
            .map_err(|_| BrandServiceError::Internal)?
            .ok_or(BrandServiceError::NotFound)
    }

    pub async fn update_status(
        &self,
        requester_role: AccountRole,
        identifier: String,
        status: BrandStatus,
    ) -> Result<Brand, BrandServiceError> {
        require_admin(requester_role, BrandServiceError::Forbidden)?;
        let identifier = normalize_identifier(identifier)?;

        self.repository
            .update_status(&identifier, status)
            .await
            .map_err(|_| BrandServiceError::Internal)?
            .ok_or(BrandServiceError::NotFound)
    }

    pub async fn delete(
        &self,
        requester_role: AccountRole,
        identifier: String,
    ) -> Result<(), BrandServiceError> {
        require_admin(requester_role, BrandServiceError::Forbidden)?;
        let identifier = normalize_identifier(identifier)?;
        let deleted = self
            .repository
            .delete(&identifier)
            .await
            .map_err(|_| BrandServiceError::Internal)?;

        deleted.then_some(()).ok_or(BrandServiceError::NotFound)
    }
}

fn normalize_identifier(identifier: String) -> Result<String, BrandServiceError> {
    let identifier = identifier.trim().to_ascii_lowercase();
    let valid = !identifier.is_empty()
        && identifier.len() <= 64
        && identifier
            .split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_alphanumeric()));

    valid
        .then_some(identifier)
        .ok_or(BrandServiceError::InvalidInput)
}

fn normalize_name(name: String) -> Result<String, BrandServiceError> {
    let name = name.trim().to_owned();
    (!name.is_empty() && name.chars().count() <= 80 && !name.chars().any(char::is_control))
        .then_some(name)
        .ok_or(BrandServiceError::InvalidInput)
}

fn validate_sort_order(sort_order: i32) -> Result<(), BrandServiceError> {
    if sort_order >= 0 {
        Ok(())
    } else {
        Err(BrandServiceError::InvalidInput)
    }
}

fn validate_avatar_data_url(value: String) -> Result<String, BrandServiceError> {
    let value = value.trim().to_owned();
    let payload = [
        "data:image/png;base64,",
        "data:image/jpeg;base64,",
        "data:image/webp;base64,",
    ]
    .into_iter()
    .find_map(|prefix| value.strip_prefix(prefix));
    let valid_payload = payload.is_some_and(|payload| {
        !payload.is_empty()
            && payload
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'='))
    });

    (value.len() <= MAX_AVATAR_DATA_URL_LENGTH && valid_payload)
        .then_some(value)
        .ok_or(BrandServiceError::InvalidInput)
}

fn build_search_pattern(query: Option<String>) -> Result<Option<String>, BrandServiceError> {
    let Some(query) = query else {
        return Ok(None);
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(None);
    }
    if query.chars().count() > MAX_SEARCH_QUERY_LENGTH || query.chars().any(char::is_control) {
        return Err(BrandServiceError::InvalidInput);
    }

    Ok(Some(format!("%{}%", escape_like_pattern(query))))
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

fn map_repository_write_error(error: RepositoryError) -> BrandServiceError {
    match error {
        RepositoryError::Conflict(
            RepositoryConflict::BrandIdentifier | RepositoryConflict::BrandPreset,
        ) => BrandServiceError::AlreadyExists,
        _ => BrandServiceError::Internal,
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_brand.rs"]
mod tests;

use crate::{
    domain::{AccountRole, MerchantApplication, UserId},
    repository::{
        MerchantApplicationRepository, NewMerchantApplicationRecord, RepositoryConflict,
        RepositoryError,
    },
};

use super::image_source::is_valid_raster_image_data_url;

const MAX_BUSINESS_NAME_LENGTH: usize = 120;
const MAX_DESCRIPTION_LENGTH: usize = 2_000;
const MAX_AVATAR_URL_LENGTH: usize = 2_048;
const MAX_WEBSITE_LENGTH: usize = 255;
const MIN_BUSINESS_NAME_LENGTH: usize = 2;
const MIN_DESCRIPTION_LENGTH: usize = 20;

#[derive(Clone)]
pub struct MerchantApplicationService {
    repository: MerchantApplicationRepository,
}

pub struct SubmitMerchantApplication {
    pub business_name: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantApplicationServiceError {
    Forbidden,
    InvalidInput,
    AlreadyExists,
    Internal,
}

impl MerchantApplicationService {
    pub fn new(repository: MerchantApplicationRepository) -> Self {
        Self { repository }
    }

    pub async fn current(
        &self,
        user_id: UserId,
    ) -> Result<Option<MerchantApplication>, MerchantApplicationServiceError> {
        self.repository
            .find_by_user(user_id)
            .await
            .map_err(|error| {
                tracing::error!(user_id, %error, "merchant application lookup failed");
                MerchantApplicationServiceError::Internal
            })
    }

    pub async fn submit(
        &self,
        user_id: UserId,
        role: AccountRole,
        application: SubmitMerchantApplication,
    ) -> Result<MerchantApplication, MerchantApplicationServiceError> {
        if role != AccountRole::Personal {
            return Err(MerchantApplicationServiceError::Forbidden);
        }

        let application = validate_application(application)?;
        self.repository
            .submit(user_id, application)
            .await
            .map_err(|error| match error {
                RepositoryError::Conflict(RepositoryConflict::MerchantApplication) => {
                    MerchantApplicationServiceError::AlreadyExists
                }
                error => {
                    tracing::error!(user_id, %error, "merchant application submission failed");
                    MerchantApplicationServiceError::Internal
                }
            })
    }
}

fn validate_application(
    application: SubmitMerchantApplication,
) -> Result<NewMerchantApplicationRecord, MerchantApplicationServiceError> {
    let business_name = application.business_name.trim().to_owned();
    let description = application.description.trim().to_owned();
    let business_name_length = business_name.chars().count();
    let description_length = description.chars().count();

    if !(MIN_BUSINESS_NAME_LENGTH..=MAX_BUSINESS_NAME_LENGTH).contains(&business_name_length)
        || business_name.chars().any(char::is_control)
        || !(MIN_DESCRIPTION_LENGTH..=MAX_DESCRIPTION_LENGTH).contains(&description_length)
        || description.chars().any(is_disallowed_multiline_control)
    {
        return Err(MerchantApplicationServiceError::InvalidInput);
    }

    Ok(NewMerchantApplicationRecord {
        business_name,
        avatar_url: application.avatar_url.map(validate_avatar).transpose()?,
        website: application.website.map(validate_website).transpose()?,
        description,
    })
}

fn validate_avatar(value: String) -> Result<String, MerchantApplicationServiceError> {
    let avatar = value.trim().to_owned();
    if is_valid_raster_image_data_url(&avatar) {
        return Ok(avatar);
    }

    validate_http_url(&avatar, MAX_AVATAR_URL_LENGTH)?;
    Ok(avatar)
}

fn validate_website(value: String) -> Result<String, MerchantApplicationServiceError> {
    let website = value.trim().to_owned();
    validate_http_url(&website, MAX_WEBSITE_LENGTH)?;
    Ok(website)
}

fn validate_http_url(
    value: &str,
    max_length: usize,
) -> Result<(), MerchantApplicationServiceError> {
    let address = value
        .strip_prefix("https://")
        .or_else(|| value.strip_prefix("http://"));

    let is_invalid = value.is_empty()
        || value.chars().count() > max_length
        || value.chars().any(char::is_whitespace)
        || address.is_none_or(|address| {
            let host = address.split(['/', '?', '#']).next().unwrap_or_default();
            host.is_empty() || !host.contains('.') || host.starts_with('.') || host.ends_with('.')
        });

    (!is_invalid)
        .then_some(())
        .ok_or(MerchantApplicationServiceError::InvalidInput)
}

fn is_disallowed_multiline_control(character: char) -> bool {
    character.is_control() && !matches!(character, '\n' | '\r' | '\t')
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_application.rs"]
mod tests;

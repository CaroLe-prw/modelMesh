use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::services::{
    ApiKeyServiceError, AppRouteServiceError, AuthServiceError, BrandPresetServiceError,
    BrandServiceError, ModelCatalogServiceError, ModelServiceError, UserManagementServiceError,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ErrorCode {
    InvalidRequest = 10_001,
    InvalidEmail = 11_001,
    InvalidPassword = 11_002,
    EmailAlreadyExists = 11_003,
    InvalidCredentials = 11_004,
    Unauthenticated = 11_005,
    Forbidden = 11_006,
    InvalidApiKey = 12_001,
    ApiKeyNameAlreadyExists = 12_002,
    ApiKeyAlreadyExists = 12_003,
    ApiKeyNotFound = 12_004,
    AppRouteNotFound = 13_001,
    InvalidAppRouteRoles = 13_002,
    InvalidBrand = 14_001,
    BrandAlreadyExists = 14_002,
    BrandPresetNotFound = 14_003,
    BrandNotFound = 14_004,
    InvalidModelCatalogLookup = 15_001,
    ModelCatalogEntryNotFound = 15_002,
    InvalidModel = 16_001,
    ModelAlreadyExists = 16_002,
    ModelNotFound = 16_003,
    InvalidManagedUser = 17_001,
    ManagedUserNotFound = 17_002,
    InvalidBalanceAdjustment = 17_003,
    ManagedUserDeleteConflict = 17_004,
    DependencyUnavailable = 90_001,
    Internal = 99_999,
}

impl ErrorCode {
    pub const fn value(self) -> u32 {
        self as u32
    }
}

#[derive(Clone, Copy, Debug)]
pub enum AppError {
    InvalidRequest,
    InvalidEmail,
    InvalidPassword,
    EmailAlreadyExists,
    InvalidCredentials,
    Unauthenticated,
    Forbidden,
    InvalidApiKey,
    ApiKeyNameAlreadyExists,
    ApiKeyAlreadyExists,
    ApiKeyNotFound,
    AppRouteNotFound,
    InvalidAppRouteRoles,
    InvalidBrand,
    BrandAlreadyExists,
    BrandPresetNotFound,
    BrandNotFound,
    InvalidModelCatalogLookup,
    ModelCatalogEntryNotFound,
    InvalidModel,
    ModelAlreadyExists,
    ModelNotFound,
    InvalidManagedUser,
    ManagedUserNotFound,
    InvalidBalanceAdjustment,
    ManagedUserDeleteConflict,
    DependencyUnavailable,
    Internal,
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: u32,
}

impl From<AuthServiceError> for AppError {
    fn from(error: AuthServiceError) -> Self {
        match error {
            AuthServiceError::InvalidEmail => Self::InvalidEmail,
            AuthServiceError::InvalidPassword => Self::InvalidPassword,
            AuthServiceError::EmailAlreadyExists => Self::EmailAlreadyExists,
            AuthServiceError::InvalidCredentials => Self::InvalidCredentials,
            AuthServiceError::Unauthenticated => Self::Unauthenticated,
            AuthServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ApiKeyServiceError> for AppError {
    fn from(error: ApiKeyServiceError) -> Self {
        match error {
            ApiKeyServiceError::Forbidden => Self::Forbidden,
            ApiKeyServiceError::InvalidInput => Self::InvalidApiKey,
            ApiKeyServiceError::NameAlreadyExists => Self::ApiKeyNameAlreadyExists,
            ApiKeyServiceError::KeyAlreadyExists => Self::ApiKeyAlreadyExists,
            ApiKeyServiceError::NotFound => Self::ApiKeyNotFound,
            ApiKeyServiceError::Internal => Self::Internal,
        }
    }
}

impl From<AppRouteServiceError> for AppError {
    fn from(error: AppRouteServiceError) -> Self {
        match error {
            AppRouteServiceError::Forbidden => Self::Forbidden,
            AppRouteServiceError::InvalidRoles => Self::InvalidAppRouteRoles,
            AppRouteServiceError::NotFound => Self::AppRouteNotFound,
            AppRouteServiceError::Internal => Self::Internal,
        }
    }
}

impl From<BrandPresetServiceError> for AppError {
    fn from(error: BrandPresetServiceError) -> Self {
        match error {
            BrandPresetServiceError::Forbidden => Self::Forbidden,
            BrandPresetServiceError::Internal => Self::Internal,
        }
    }
}

impl From<BrandServiceError> for AppError {
    fn from(error: BrandServiceError) -> Self {
        match error {
            BrandServiceError::Forbidden => Self::Forbidden,
            BrandServiceError::InvalidInput => Self::InvalidBrand,
            BrandServiceError::AlreadyExists => Self::BrandAlreadyExists,
            BrandServiceError::PresetNotFound => Self::BrandPresetNotFound,
            BrandServiceError::NotFound => Self::BrandNotFound,
            BrandServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ModelCatalogServiceError> for AppError {
    fn from(error: ModelCatalogServiceError) -> Self {
        match error {
            ModelCatalogServiceError::Forbidden => Self::Forbidden,
            ModelCatalogServiceError::InvalidInput => Self::InvalidModelCatalogLookup,
            ModelCatalogServiceError::NotFound => Self::ModelCatalogEntryNotFound,
            ModelCatalogServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ModelServiceError> for AppError {
    fn from(error: ModelServiceError) -> Self {
        match error {
            ModelServiceError::Forbidden => Self::Forbidden,
            ModelServiceError::InvalidInput => Self::InvalidModel,
            ModelServiceError::AlreadyExists => Self::ModelAlreadyExists,
            ModelServiceError::BrandNotFound => Self::BrandNotFound,
            ModelServiceError::NotFound => Self::ModelNotFound,
            ModelServiceError::Internal => Self::Internal,
        }
    }
}

impl From<UserManagementServiceError> for AppError {
    fn from(error: UserManagementServiceError) -> Self {
        match error {
            UserManagementServiceError::Forbidden => Self::Forbidden,
            UserManagementServiceError::InvalidEmail => Self::InvalidEmail,
            UserManagementServiceError::InvalidPassword => Self::InvalidPassword,
            UserManagementServiceError::EmailAlreadyExists => Self::EmailAlreadyExists,
            UserManagementServiceError::InvalidInput => Self::InvalidManagedUser,
            UserManagementServiceError::InvalidBalanceAdjustment => Self::InvalidBalanceAdjustment,
            UserManagementServiceError::DeleteConflict => Self::ManagedUserDeleteConflict,
            UserManagementServiceError::NotFound => Self::ManagedUserNotFound,
            UserManagementServiceError::Internal => Self::Internal,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::InvalidRequest => (StatusCode::BAD_REQUEST, ErrorCode::InvalidRequest),
            Self::InvalidEmail => (StatusCode::BAD_REQUEST, ErrorCode::InvalidEmail),
            Self::InvalidPassword => (StatusCode::BAD_REQUEST, ErrorCode::InvalidPassword),
            Self::EmailAlreadyExists => (StatusCode::CONFLICT, ErrorCode::EmailAlreadyExists),
            Self::InvalidCredentials => (StatusCode::UNAUTHORIZED, ErrorCode::InvalidCredentials),
            Self::Unauthenticated => (StatusCode::UNAUTHORIZED, ErrorCode::Unauthenticated),
            Self::Forbidden => (StatusCode::FORBIDDEN, ErrorCode::Forbidden),
            Self::InvalidApiKey => (StatusCode::BAD_REQUEST, ErrorCode::InvalidApiKey),
            Self::ApiKeyNameAlreadyExists => {
                (StatusCode::CONFLICT, ErrorCode::ApiKeyNameAlreadyExists)
            }
            Self::ApiKeyAlreadyExists => (StatusCode::CONFLICT, ErrorCode::ApiKeyAlreadyExists),
            Self::ApiKeyNotFound => (StatusCode::NOT_FOUND, ErrorCode::ApiKeyNotFound),
            Self::AppRouteNotFound => (StatusCode::NOT_FOUND, ErrorCode::AppRouteNotFound),
            Self::InvalidAppRouteRoles => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidAppRouteRoles)
            }
            Self::InvalidBrand => (StatusCode::BAD_REQUEST, ErrorCode::InvalidBrand),
            Self::BrandAlreadyExists => (StatusCode::CONFLICT, ErrorCode::BrandAlreadyExists),
            Self::BrandPresetNotFound => (StatusCode::BAD_REQUEST, ErrorCode::BrandPresetNotFound),
            Self::BrandNotFound => (StatusCode::NOT_FOUND, ErrorCode::BrandNotFound),
            Self::InvalidModelCatalogLookup => (
                StatusCode::BAD_REQUEST,
                ErrorCode::InvalidModelCatalogLookup,
            ),
            Self::ModelCatalogEntryNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::ModelCatalogEntryNotFound)
            }
            Self::InvalidModel => (StatusCode::BAD_REQUEST, ErrorCode::InvalidModel),
            Self::ModelAlreadyExists => (StatusCode::CONFLICT, ErrorCode::ModelAlreadyExists),
            Self::ModelNotFound => (StatusCode::NOT_FOUND, ErrorCode::ModelNotFound),
            Self::InvalidManagedUser => (StatusCode::BAD_REQUEST, ErrorCode::InvalidManagedUser),
            Self::ManagedUserNotFound => (StatusCode::NOT_FOUND, ErrorCode::ManagedUserNotFound),
            Self::InvalidBalanceAdjustment => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidBalanceAdjustment)
            }
            Self::ManagedUserDeleteConflict => {
                (StatusCode::CONFLICT, ErrorCode::ManagedUserDeleteConflict)
            }
            Self::DependencyUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorCode::DependencyUnavailable,
            ),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, ErrorCode::Internal),
        };

        (
            status,
            Json(ErrorEnvelope {
                error: ErrorBody { code: code.value() },
            }),
        )
            .into_response()
    }
}

#[cfg(test)]
#[path = "../tests/unit/error.rs"]
mod tests;

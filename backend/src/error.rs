use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::services::{ApiKeyServiceError, AppRouteServiceError, AuthServiceError};

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

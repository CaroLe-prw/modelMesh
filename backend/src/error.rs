use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::services::AuthServiceError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ErrorCode {
    InvalidRequest = 10_001,
    InvalidEmail = 11_001,
    InvalidPassword = 11_002,
    EmailAlreadyExists = 11_003,
    InvalidCredentials = 11_004,
    Unauthenticated = 11_005,
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

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::InvalidRequest => (StatusCode::BAD_REQUEST, ErrorCode::InvalidRequest),
            Self::InvalidEmail => (StatusCode::BAD_REQUEST, ErrorCode::InvalidEmail),
            Self::InvalidPassword => (StatusCode::BAD_REQUEST, ErrorCode::InvalidPassword),
            Self::EmailAlreadyExists => (StatusCode::CONFLICT, ErrorCode::EmailAlreadyExists),
            Self::InvalidCredentials => (StatusCode::UNAUTHORIZED, ErrorCode::InvalidCredentials),
            Self::Unauthenticated => (StatusCode::UNAUTHORIZED, ErrorCode::Unauthenticated),
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

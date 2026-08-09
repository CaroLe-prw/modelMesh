mod access_token;
mod api_key;
mod app_route;
mod app_route_cache;
mod auth;

use std::{fmt, ops::Deref};

use sea_orm::{DbErr, RuntimeErr};

pub use access_token::AccessTokenRepository;
pub use api_key::{ApiKeyRepository, ApiKeySearch, NewApiKeyRecord, UpdateApiKeyRecord};
pub use app_route::{AppRouteRepository, AppRouteRoleChange};
pub use app_route_cache::AppRouteCacheRepository;
pub use auth::{AuthRepository, NewUserRecord};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RepositoryConflict {
    ApiKeyName,
    ApiKeyValue,
    UserEmail,
}

#[derive(Debug)]
pub enum RepositoryError {
    Conflict(RepositoryConflict),
    Database(DbErr),
    InvalidData(String),
}

impl From<DbErr> for RepositoryError {
    fn from(error: DbErr) -> Self {
        Self::Database(error)
    }
}

impl fmt::Display for RepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Conflict(conflict) => write!(formatter, "repository conflict: {conflict:?}"),
            Self::Database(error) => write!(formatter, "database operation failed: {error}"),
            Self::InvalidData(message) => {
                write!(formatter, "database returned invalid data: {message}")
            }
        }
    }
}

impl std::error::Error for RepositoryError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::Conflict(_) | Self::InvalidData(_) => None,
        }
    }
}

fn database_constraint(error: &DbErr) -> Option<&str> {
    let runtime_error = match error {
        DbErr::Exec(error) | DbErr::Query(error) => error,
        _ => return None,
    };
    let RuntimeErr::SqlxError(error) = runtime_error else {
        return None;
    };
    let sea_orm::sqlx::Error::Database(database_error) = error.deref() else {
        return None;
    };

    database_error.constraint()
}

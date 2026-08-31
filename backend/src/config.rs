use std::{env, io, net::SocketAddr, path::PathBuf};

use crate::{redis_key, security::derive_credential_key};

const DEFAULT_BIND_ADDRESS: &str = "127.0.0.1:3000";
const DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS: u64 = 5;
const DEFAULT_DATABASE_MAX_CONNECTIONS: u32 = 10;
const DEFAULT_ENVIRONMENT: &str = "development";
const DEFAULT_LOG_DIRECTORY: &str = "logs";
const DEFAULT_LOG_FILTER: &str = "info";
const DEFAULT_MODELS_DEV_CATALOG_URL: &str = "https://models.dev/api.json";
const DEFAULT_MODELS_DEV_CONNECT_TIMEOUT_SECONDS: u64 = 10;
const DEFAULT_MODELS_DEV_MAX_ATTEMPTS: u32 = 3;
const DEFAULT_MODELS_DEV_REQUEST_TIMEOUT_SECONDS: u64 = 120;
const DEFAULT_MODELS_DEV_RETRY_DELAY_SECONDS: u64 = 2;
const DEFAULT_MODELS_DEV_SYNC_INTERVAL_HOURS: u64 = 24;
const DEFAULT_REDIS_MAX_CONNECTIONS: usize = 10;
const DEFAULT_REDIS_WAIT_TIMEOUT_SECONDS: u64 = 5;
const DEFAULT_DEVELOPMENT_PROVIDER_CREDENTIAL_SECRET: &str =
    "modelmesh-development-only-provider-credential-key";
const BIND_ADDRESS_ENV: &str = "MODELMESH_BIND_ADDRESS";
const ACCESS_TOKEN_TTL_SECONDS_ENV: &str = "MODELMESH_ACCESS_TOKEN_TTL_SECONDS";
const DATABASE_ACQUIRE_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_DATABASE_ACQUIRE_TIMEOUT_SECONDS";
const DATABASE_MAX_CONNECTIONS_ENV: &str = "MODELMESH_DATABASE_MAX_CONNECTIONS";
const DATABASE_URL_ENV: &str = "DATABASE_URL";
const ENVIRONMENT_ENV: &str = "MODELMESH_ENVIRONMENT";
const LOG_DIRECTORY_ENV: &str = "MODELMESH_LOG_DIRECTORY";
const LOG_FILTER_ENV: &str = "MODELMESH_LOG_FILTER";
const MODELS_DEV_CATALOG_URL_ENV: &str = "MODELMESH_MODELS_DEV_CATALOG_URL";
const MODELS_DEV_CONNECT_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_MODELS_DEV_CONNECT_TIMEOUT_SECONDS";
const MODELS_DEV_MAX_ATTEMPTS_ENV: &str = "MODELMESH_MODELS_DEV_MAX_ATTEMPTS";
const MODELS_DEV_REQUEST_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_MODELS_DEV_REQUEST_TIMEOUT_SECONDS";
const MODELS_DEV_RETRY_DELAY_SECONDS_ENV: &str = "MODELMESH_MODELS_DEV_RETRY_DELAY_SECONDS";
const MODELS_DEV_SYNC_INTERVAL_HOURS_ENV: &str = "MODELMESH_MODELS_DEV_SYNC_INTERVAL_HOURS";
const REDIS_MAX_CONNECTIONS_ENV: &str = "MODELMESH_REDIS_MAX_CONNECTIONS";
const REDIS_URL_ENV: &str = "REDIS_URL";
const REDIS_WAIT_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_REDIS_WAIT_TIMEOUT_SECONDS";
const PROVIDER_CREDENTIAL_SECRET_ENV: &str = "MODELMESH_PROVIDER_CREDENTIAL_SECRET";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AppEnvironment {
    Development,
    Test,
    Production,
}

impl AppEnvironment {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Development => "development",
            Self::Test => "test",
            Self::Production => "production",
        }
    }

    pub const fn writes_log_files(self) -> bool {
        matches!(self, Self::Production)
    }

    pub const fn logs_database_queries(self) -> bool {
        matches!(self, Self::Development)
    }
}

#[derive(Clone)]
pub struct AppConfig {
    pub access_token_ttl_seconds: u64,
    pub bind_address: SocketAddr,
    pub database_acquire_timeout_seconds: u64,
    pub database_max_connections: u32,
    pub database_url: String,
    pub environment: AppEnvironment,
    pub log_directory: PathBuf,
    pub log_filter: String,
    pub models_dev_catalog_url: String,
    pub models_dev_connect_timeout_seconds: u64,
    pub models_dev_max_attempts: u32,
    pub models_dev_request_timeout_seconds: u64,
    pub models_dev_retry_delay_seconds: u64,
    pub models_dev_sync_interval_seconds: u64,
    pub provider_credential_key: [u8; 32],
    pub provider_credential_key_is_default: bool,
    pub redis_max_connections: usize,
    pub redis_url: String,
    pub redis_wait_timeout_seconds: u64,
}

impl AppConfig {
    pub fn from_env() -> io::Result<Self> {
        let access_token_ttl_seconds = env::var(ACCESS_TOKEN_TTL_SECONDS_ENV)
            .map_or(Ok(redis_key::ttl::ACCESS_TOKEN_SECONDS), |value| {
                parse_positive_u64(ACCESS_TOKEN_TTL_SECONDS_ENV, &value)
            })?;
        let bind_address = parse_socket_address(
            BIND_ADDRESS_ENV,
            &env::var(BIND_ADDRESS_ENV).unwrap_or_else(|_| DEFAULT_BIND_ADDRESS.to_owned()),
        )?;
        let database_acquire_timeout_seconds = env::var(DATABASE_ACQUIRE_TIMEOUT_SECONDS_ENV)
            .map_or(Ok(DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS), |value| {
                parse_positive_u64(DATABASE_ACQUIRE_TIMEOUT_SECONDS_ENV, &value)
            })?;
        let database_max_connections = env::var(DATABASE_MAX_CONNECTIONS_ENV)
            .map_or(Ok(DEFAULT_DATABASE_MAX_CONNECTIONS), |value| {
                parse_positive_u32(DATABASE_MAX_CONNECTIONS_ENV, &value)
            })?;
        let database_url = required_env(DATABASE_URL_ENV)?;
        let environment = parse_environment(
            ENVIRONMENT_ENV,
            &env::var(ENVIRONMENT_ENV).unwrap_or_else(|_| DEFAULT_ENVIRONMENT.to_owned()),
        )?;
        let (provider_credential_key, provider_credential_key_is_default) =
            parse_provider_credential_secret(
                environment,
                env::var(PROVIDER_CREDENTIAL_SECRET_ENV).ok().as_deref(),
            )?;
        let log_directory = PathBuf::from(
            env::var(LOG_DIRECTORY_ENV).unwrap_or_else(|_| DEFAULT_LOG_DIRECTORY.to_owned()),
        );
        let log_filter = env::var(LOG_FILTER_ENV).unwrap_or_else(|_| DEFAULT_LOG_FILTER.to_owned());
        let models_dev_catalog_url = env::var(MODELS_DEV_CATALOG_URL_ENV)
            .unwrap_or_else(|_| DEFAULT_MODELS_DEV_CATALOG_URL.to_owned());
        let models_dev_connect_timeout_seconds = env::var(MODELS_DEV_CONNECT_TIMEOUT_SECONDS_ENV)
            .map_or(
            Ok(DEFAULT_MODELS_DEV_CONNECT_TIMEOUT_SECONDS),
            |value| parse_positive_u64(MODELS_DEV_CONNECT_TIMEOUT_SECONDS_ENV, &value),
        )?;
        let models_dev_max_attempts = env::var(MODELS_DEV_MAX_ATTEMPTS_ENV)
            .map_or(Ok(DEFAULT_MODELS_DEV_MAX_ATTEMPTS), |value| {
                parse_positive_u32(MODELS_DEV_MAX_ATTEMPTS_ENV, &value)
            })?;
        if models_dev_max_attempts > 10 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{MODELS_DEV_MAX_ATTEMPTS_ENV} must not exceed 10"),
            ));
        }
        let models_dev_request_timeout_seconds = env::var(MODELS_DEV_REQUEST_TIMEOUT_SECONDS_ENV)
            .map_or(
            Ok(DEFAULT_MODELS_DEV_REQUEST_TIMEOUT_SECONDS),
            |value| parse_positive_u64(MODELS_DEV_REQUEST_TIMEOUT_SECONDS_ENV, &value),
        )?;
        let models_dev_retry_delay_seconds = env::var(MODELS_DEV_RETRY_DELAY_SECONDS_ENV)
            .map_or(Ok(DEFAULT_MODELS_DEV_RETRY_DELAY_SECONDS), |value| {
                parse_positive_u64(MODELS_DEV_RETRY_DELAY_SECONDS_ENV, &value)
            })?;
        if models_dev_request_timeout_seconds < models_dev_connect_timeout_seconds {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "{MODELS_DEV_REQUEST_TIMEOUT_SECONDS_ENV} must be greater than or equal to {MODELS_DEV_CONNECT_TIMEOUT_SECONDS_ENV}"
                ),
            ));
        }
        let models_dev_sync_interval_hours = env::var(MODELS_DEV_SYNC_INTERVAL_HOURS_ENV)
            .map_or(Ok(DEFAULT_MODELS_DEV_SYNC_INTERVAL_HOURS), |value| {
                parse_positive_u64(MODELS_DEV_SYNC_INTERVAL_HOURS_ENV, &value)
            })?;
        let models_dev_sync_interval_seconds = models_dev_sync_interval_hours
            .checked_mul(60 * 60)
            .ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    format!("{MODELS_DEV_SYNC_INTERVAL_HOURS_ENV} is too large"),
                )
            })?;
        let redis_max_connections = env::var(REDIS_MAX_CONNECTIONS_ENV)
            .map_or(Ok(DEFAULT_REDIS_MAX_CONNECTIONS), |value| {
                parse_positive_usize(REDIS_MAX_CONNECTIONS_ENV, &value)
            })?;
        let redis_url = required_env(REDIS_URL_ENV)?;
        let redis_wait_timeout_seconds = env::var(REDIS_WAIT_TIMEOUT_SECONDS_ENV)
            .map_or(Ok(DEFAULT_REDIS_WAIT_TIMEOUT_SECONDS), |value| {
                parse_positive_u64(REDIS_WAIT_TIMEOUT_SECONDS_ENV, &value)
            })?;

        Ok(Self {
            access_token_ttl_seconds,
            bind_address,
            database_acquire_timeout_seconds,
            database_max_connections,
            database_url,
            environment,
            log_directory,
            log_filter,
            models_dev_catalog_url,
            models_dev_connect_timeout_seconds,
            models_dev_max_attempts,
            models_dev_request_timeout_seconds,
            models_dev_retry_delay_seconds,
            models_dev_sync_interval_seconds,
            provider_credential_key,
            provider_credential_key_is_default,
            redis_max_connections,
            redis_url,
            redis_wait_timeout_seconds,
        })
    }
}

fn parse_provider_credential_secret(
    environment: AppEnvironment,
    value: Option<&str>,
) -> io::Result<([u8; 32], bool)> {
    let (value, is_default) = match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => (value, false),
        None if environment != AppEnvironment::Production => {
            (DEFAULT_DEVELOPMENT_PROVIDER_CREDENTIAL_SECRET, true)
        }
        None => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{PROVIDER_CREDENTIAL_SECRET_ENV} is required in production"),
            ));
        }
    };
    if value.chars().count() < 32 || value.chars().any(char::is_control) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{PROVIDER_CREDENTIAL_SECRET_ENV} must contain at least 32 characters"),
        ));
    }

    Ok((derive_credential_key(value), is_default))
}

fn required_env(name: &str) -> io::Result<String> {
    env::var(name)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, format!("{name} is required")))
}

fn parse_environment(name: &str, value: &str) -> io::Result<AppEnvironment> {
    match value.trim().to_ascii_lowercase().as_str() {
        "development" => Ok(AppEnvironment::Development),
        "test" => Ok(AppEnvironment::Test),
        "production" => Ok(AppEnvironment::Production),
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be one of: development, test, production"),
        )),
    }
}

fn parse_socket_address(name: &str, value: &str) -> io::Result<SocketAddr> {
    value.parse::<SocketAddr>().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be a valid socket address: {error}"),
        )
    })
}

fn parse_positive_u32(name: &str, value: &str) -> io::Result<u32> {
    let parsed = value.parse::<u32>().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be a positive integer: {error}"),
        )
    })?;

    if parsed == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be greater than zero"),
        ));
    }

    Ok(parsed)
}

fn parse_positive_u64(name: &str, value: &str) -> io::Result<u64> {
    let parsed = value.parse::<u64>().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be a positive integer: {error}"),
        )
    })?;

    if parsed == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be greater than zero"),
        ));
    }

    Ok(parsed)
}

fn parse_positive_usize(name: &str, value: &str) -> io::Result<usize> {
    let parsed = value.parse::<usize>().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be a positive integer: {error}"),
        )
    })?;

    if parsed == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} must be greater than zero"),
        ));
    }

    Ok(parsed)
}

#[cfg(test)]
#[path = "../tests/unit/config.rs"]
mod tests;

use std::{env, io, net::SocketAddr, path::PathBuf};

use crate::redis_key;

const DEFAULT_BIND_ADDRESS: &str = "127.0.0.1:3000";
const DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS: u64 = 5;
const DEFAULT_DATABASE_MAX_CONNECTIONS: u32 = 10;
const DEFAULT_ENVIRONMENT: &str = "development";
const DEFAULT_LOG_DIRECTORY: &str = "logs";
const DEFAULT_LOG_FILTER: &str = "info";
const DEFAULT_REDIS_MAX_CONNECTIONS: usize = 10;
const DEFAULT_REDIS_WAIT_TIMEOUT_SECONDS: u64 = 5;
const BIND_ADDRESS_ENV: &str = "MODELMESH_BIND_ADDRESS";
const ACCESS_TOKEN_TTL_SECONDS_ENV: &str = "MODELMESH_ACCESS_TOKEN_TTL_SECONDS";
const DATABASE_ACQUIRE_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_DATABASE_ACQUIRE_TIMEOUT_SECONDS";
const DATABASE_MAX_CONNECTIONS_ENV: &str = "MODELMESH_DATABASE_MAX_CONNECTIONS";
const DATABASE_URL_ENV: &str = "DATABASE_URL";
const ENVIRONMENT_ENV: &str = "MODELMESH_ENVIRONMENT";
const LOG_DIRECTORY_ENV: &str = "MODELMESH_LOG_DIRECTORY";
const LOG_FILTER_ENV: &str = "MODELMESH_LOG_FILTER";
const REDIS_MAX_CONNECTIONS_ENV: &str = "MODELMESH_REDIS_MAX_CONNECTIONS";
const REDIS_URL_ENV: &str = "REDIS_URL";
const REDIS_WAIT_TIMEOUT_SECONDS_ENV: &str = "MODELMESH_REDIS_WAIT_TIMEOUT_SECONDS";

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

pub struct AppConfig {
    pub access_token_ttl_seconds: u64,
    pub bind_address: SocketAddr,
    pub database_acquire_timeout_seconds: u64,
    pub database_max_connections: u32,
    pub database_url: String,
    pub environment: AppEnvironment,
    pub log_directory: PathBuf,
    pub log_filter: String,
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
        let log_directory = PathBuf::from(
            env::var(LOG_DIRECTORY_ENV).unwrap_or_else(|_| DEFAULT_LOG_DIRECTORY.to_owned()),
        );
        let log_filter = env::var(LOG_FILTER_ENV).unwrap_or_else(|_| DEFAULT_LOG_FILTER.to_owned());
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
            redis_max_connections,
            redis_url,
            redis_wait_timeout_seconds,
        })
    }
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

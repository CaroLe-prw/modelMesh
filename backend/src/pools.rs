use std::{io, time::Duration};

use deadpool_redis::{
    Config as RedisConfig, Pool as RedisPool, PoolConfig as RedisPoolConfig, Runtime, Timeouts,
};
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};

use crate::config::AppConfig;

pub async fn create_database_connection(config: &AppConfig) -> Result<DatabaseConnection, DbErr> {
    let mut options = ConnectOptions::new(config.database_url.clone());
    options
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(config.database_acquire_timeout_seconds))
        .sqlx_logging(config.environment.logs_database_queries())
        .sqlx_logging_level(log::LevelFilter::Info);

    Database::connect(options).await
}

pub async fn verify_database_connection(database: &DatabaseConnection) -> io::Result<()> {
    database.ping().await.map_err(io::Error::other)
}

pub fn create_redis_pool(config: &AppConfig) -> Result<RedisPool, deadpool_redis::CreatePoolError> {
    let mut redis_config = RedisConfig::from_url(config.redis_url.clone());
    let pool_config = RedisPoolConfig {
        max_size: config.redis_max_connections,
        timeouts: Timeouts {
            wait: Some(Duration::from_secs(config.redis_wait_timeout_seconds)),
            ..Timeouts::default()
        },
        ..RedisPoolConfig::default()
    };
    redis_config.pool = Some(pool_config);

    redis_config.create_pool(Some(Runtime::Tokio1))
}

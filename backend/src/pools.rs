use std::{io, time::Duration};

use deadpool_redis::{
    Config as RedisConfig, Pool as RedisPool, PoolConfig as RedisPoolConfig, Runtime, Timeouts,
};
use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::config::AppConfig;

pub async fn create_database_pool(config: &AppConfig) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(config.database_acquire_timeout_seconds))
        .connect(&config.database_url)
        .await
}

pub async fn verify_database_pool(pool: &PgPool) -> io::Result<()> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await
        .map(|_| ())
        .map_err(io::Error::other)
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

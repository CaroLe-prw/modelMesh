use sqlx::PgPool;

use crate::{
    clients::RedisClient,
    repository::{AccessTokenRepository, AuthRepository},
    services::AuthService,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_service: AuthService,
    pub database_pool: PgPool,
    pub redis: RedisClient,
    pub service_name: &'static str,
    pub version: &'static str,
}

impl AppState {
    pub fn new(database_pool: PgPool, redis: RedisClient, access_token_ttl_seconds: u64) -> Self {
        Self {
            auth_service: AuthService::new(
                AuthRepository::new(database_pool.clone()),
                AccessTokenRepository::new(redis.clone(), access_token_ttl_seconds),
            ),
            database_pool,
            redis,
            service_name: "modelmesh-backend",
            version: env!("CARGO_PKG_VERSION"),
        }
    }

    #[cfg(test)]
    pub fn for_test() -> Self {
        let database_pool = sqlx::postgres::PgPoolOptions::new()
            .connect_lazy("postgres://modelmesh:modelmesh@127.0.0.1/modelmesh")
            .expect("test database URL should be valid");
        let redis_pool = deadpool_redis::Config::from_url("redis://127.0.0.1/")
            .create_pool(Some(deadpool_redis::Runtime::Tokio1))
            .expect("test Redis URL should be valid");

        Self::new(database_pool, RedisClient::new(redis_pool), 24 * 60 * 60)
    }
}

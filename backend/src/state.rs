use sea_orm::DatabaseConnection;

use crate::{
    clients::RedisClient,
    repository::{
        AccessTokenRepository, ApiKeyRepository, AppRouteCacheRepository, AppRouteRepository,
        AuthRepository,
    },
    services::{ApiKeyService, AppRouteService, AuthService},
};

#[derive(Clone)]
pub struct AppState {
    pub auth_service: AuthService,
    pub api_key_service: ApiKeyService,
    pub app_route_service: AppRouteService,
    pub database: DatabaseConnection,
    pub redis: RedisClient,
    pub service_name: &'static str,
    pub version: &'static str,
}

impl AppState {
    pub fn new(
        database: DatabaseConnection,
        redis: RedisClient,
        access_token_ttl_seconds: u64,
    ) -> Self {
        let auth_repository = AuthRepository::new(database.clone());

        Self {
            app_route_service: AppRouteService::new(
                AppRouteRepository::new(database.clone()),
                AppRouteCacheRepository::with_default_ttl(redis.clone()),
                auth_repository.clone(),
            ),
            api_key_service: ApiKeyService::new(ApiKeyRepository::new(database.clone())),
            auth_service: AuthService::new(
                auth_repository,
                AccessTokenRepository::new(redis.clone(), access_token_ttl_seconds),
            ),
            database,
            redis,
            service_name: "modelmesh-backend",
            version: env!("CARGO_PKG_VERSION"),
        }
    }

    #[cfg(test)]
    pub fn for_test() -> Self {
        let database = DatabaseConnection::default();
        let redis_pool = deadpool_redis::Config::from_url("redis://127.0.0.1/")
            .create_pool(Some(deadpool_redis::Runtime::Tokio1))
            .expect("test Redis URL should be valid");

        Self::new(database, RedisClient::new(redis_pool), 24 * 60 * 60)
    }
}

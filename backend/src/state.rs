use sea_orm::DatabaseConnection;

use crate::{
    clients::RedisClient,
    repository::{
        AccessTokenRepository, ApiKeyRepository, AppRouteCacheRepository, AppRouteRepository,
        AuthRepository, BrandPresetRepository, BrandRepository, ModelCatalogRepository,
        ModelRepository, UserCacheRepository,
    },
    services::{
        ApiKeyService, AppRouteService, AuthService, BrandPresetService, BrandService,
        ModelCatalogService, ModelService,
    },
};

#[derive(Clone)]
pub struct AppState {
    pub auth_service: AuthService,
    pub api_key_service: ApiKeyService,
    pub app_route_service: AppRouteService,
    pub brand_service: BrandService,
    pub brand_preset_service: BrandPresetService,
    pub model_catalog_service: ModelCatalogService,
    pub model_service: ModelService,
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
            brand_service: BrandService::new(
                BrandRepository::new(database.clone()),
                BrandPresetRepository::new(database.clone()),
            ),
            brand_preset_service: BrandPresetService::new(BrandPresetRepository::new(
                database.clone(),
            )),
            model_catalog_service: ModelCatalogService::new(ModelCatalogRepository::new(
                database.clone(),
            )),
            model_service: ModelService::new(
                ModelRepository::new(database.clone()),
                ModelCatalogRepository::new(database.clone()),
            ),
            auth_service: AuthService::new(
                auth_repository,
                AccessTokenRepository::new(redis.clone(), access_token_ttl_seconds),
                UserCacheRepository::with_default_ttl(redis.clone()),
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

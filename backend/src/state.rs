use std::time::Duration;

use sea_orm::DatabaseConnection;

use crate::{
    clients::{RedisClient, UpstreamInferenceClient, UpstreamModelsClient},
    repository::{
        AccessTokenRepository, ApiKeyRepository, AppRouteCacheRepository, AppRouteRepository,
        AuthRepository, BrandPresetRepository, BrandRepository, CatalogReviewRepository,
        MerchantApplicationRepository, MerchantChannelRepository, MerchantManagementRepository,
        MerchantModelRepository, MerchantProfileRepository, MerchantRequestRepository,
        MerchantSettlementSettingsRepository, ModelCatalogRepository, ModelRepository,
        PriceSettingsRepository, UserCacheRepository, UserManagementRepository,
    },
    security::CredentialCipher,
    services::{
        ApiKeyService, AppRouteService, AuthService, BrandPresetService, BrandService,
        CatalogReviewService, MerchantApplicationService, MerchantChannelService,
        MerchantManagementService, MerchantModelService, MerchantProfileService,
        MerchantRequestService, MerchantSettlementSettingsService, ModelCatalogService,
        ModelService, PriceSettingsService, UserManagementService,
    },
};

#[derive(Clone)]
pub struct AppState {
    pub auth_service: AuthService,
    pub api_key_service: ApiKeyService,
    pub app_route_service: AppRouteService,
    pub brand_service: BrandService,
    pub brand_preset_service: BrandPresetService,
    pub catalog_review_service: CatalogReviewService,
    pub merchant_application_service: MerchantApplicationService,
    pub merchant_channel_service: MerchantChannelService,
    pub merchant_management_service: MerchantManagementService,
    pub merchant_model_service: MerchantModelService,
    pub merchant_profile_service: MerchantProfileService,
    pub merchant_request_service: MerchantRequestService,
    pub merchant_settlement_settings_service: MerchantSettlementSettingsService,
    pub model_catalog_service: ModelCatalogService,
    pub model_service: ModelService,
    pub price_settings_service: PriceSettingsService,
    pub user_management_service: UserManagementService,
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
        provider_credential_key: [u8; 32],
    ) -> Self {
        let auth_repository = AuthRepository::new(database.clone());
        let brand_repository = BrandRepository::new(database.clone());
        let merchant_channel_repository = MerchantChannelRepository::new(database.clone());
        let model_repository = ModelRepository::new(database.clone());
        let price_settings_repository = PriceSettingsRepository::new(database.clone());
        let credential_cipher = CredentialCipher::new(provider_credential_key);
        let upstream_models_client =
            UpstreamModelsClient::new(Duration::from_secs(5), Duration::from_secs(20));
        let upstream_inference_client =
            UpstreamInferenceClient::new(Duration::from_secs(5), Duration::from_secs(20));
        let auth_service = AuthService::new(
            auth_repository.clone(),
            AccessTokenRepository::new(redis.clone(), access_token_ttl_seconds),
            UserCacheRepository::with_default_ttl(redis.clone()),
            std::time::Duration::from_secs(access_token_ttl_seconds),
        );

        Self {
            app_route_service: AppRouteService::new(
                AppRouteRepository::new(database.clone()),
                AppRouteCacheRepository::with_default_ttl(redis.clone()),
                auth_repository,
            ),
            api_key_service: ApiKeyService::new(ApiKeyRepository::new(database.clone())),
            brand_service: BrandService::new(
                brand_repository.clone(),
                BrandPresetRepository::new(database.clone()),
            ),
            brand_preset_service: BrandPresetService::new(BrandPresetRepository::new(
                database.clone(),
            )),
            catalog_review_service: CatalogReviewService::new(
                CatalogReviewRepository::new(database.clone()),
                credential_cipher.clone(),
                upstream_inference_client,
                upstream_models_client.clone(),
            ),
            merchant_application_service: MerchantApplicationService::new(
                MerchantApplicationRepository::new(database.clone()),
            ),
            merchant_channel_service: MerchantChannelService::new(
                merchant_channel_repository.clone(),
                brand_repository,
                credential_cipher.clone(),
                upstream_models_client,
            ),
            merchant_management_service: MerchantManagementService::new(
                MerchantManagementRepository::new(database.clone()),
                auth_service.clone(),
            ),
            merchant_model_service: MerchantModelService::new(
                MerchantModelRepository::new(database.clone()),
                merchant_channel_repository,
                model_repository.clone(),
                price_settings_repository.clone(),
            ),
            merchant_profile_service: MerchantProfileService::new(
                MerchantProfileRepository::new(database.clone()),
                credential_cipher,
            ),
            merchant_request_service: MerchantRequestService::new(MerchantRequestRepository::new(
                database.clone(),
            )),
            merchant_settlement_settings_service: MerchantSettlementSettingsService::new(
                MerchantSettlementSettingsRepository::new(database.clone()),
            ),
            model_catalog_service: ModelCatalogService::new(ModelCatalogRepository::new(
                database.clone(),
            )),
            model_service: ModelService::new(
                model_repository,
                ModelCatalogRepository::new(database.clone()),
            ),
            price_settings_service: PriceSettingsService::new(price_settings_repository),
            user_management_service: UserManagementService::new(
                UserManagementRepository::new(database.clone()),
                auth_service.clone(),
            ),
            auth_service,
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

        Self::new(
            database,
            RedisClient::new(redis_pool),
            24 * 60 * 60,
            crate::security::derive_credential_key("modelmesh-test-provider-credential-secret"),
        )
    }
}

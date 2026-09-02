use uuid::Uuid;

use crate::{
    domain::{
        MarketplaceCatalog, MarketplaceMerchant, MarketplaceRouteState, PriceSettings, UserId,
    },
    repository::{MarketplaceRepository, MarketplaceRouteMutationResult, PriceSettingsRepository},
};

#[derive(Clone)]
pub struct MarketplaceService {
    repository: MarketplaceRepository,
    price_settings_repository: PriceSettingsRepository,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MarketplaceServiceError {
    InvalidInput,
    ApiKeyNotFound,
    MerchantNotFound,
    Internal,
}

impl MarketplaceService {
    pub fn new(
        repository: MarketplaceRepository,
        price_settings_repository: PriceSettingsRepository,
    ) -> Self {
        Self {
            repository,
            price_settings_repository,
        }
    }

    pub async fn catalog(
        &self,
    ) -> Result<(MarketplaceCatalog, Vec<PriceSettings>), MarketplaceServiceError> {
        let (catalog, display_currencies) = tokio::join!(
            self.repository.catalog(),
            self.price_settings_repository.list(),
        );
        let catalog = catalog.map_err(|error| {
            tracing::error!(error = %error, "marketplace catalog lookup failed");
            MarketplaceServiceError::Internal
        })?;
        let display_currencies = display_currencies.map_err(|error| {
            tracing::error!(error = %error, "marketplace display currency lookup failed");
            MarketplaceServiceError::Internal
        })?;

        Ok((catalog, display_currencies))
    }

    pub async fn merchants(
        &self,
        user_id: UserId,
        model_id: i64,
        api_key_id: Option<String>,
    ) -> Result<Vec<MarketplaceMerchant>, MarketplaceServiceError> {
        validate_model_id(model_id)?;
        let api_key_id = api_key_id.map(parse_uuid).transpose()?;
        if let Some(api_key_id) = api_key_id
            && !self
                .repository
                .api_key_belongs_to_user(user_id, api_key_id)
                .await
                .map_err(|error| {
                    tracing::error!(
                        error = %error,
                        user_id,
                        model_id,
                        "marketplace API key ownership lookup failed"
                    );
                    MarketplaceServiceError::Internal
                })?
        {
            return Err(MarketplaceServiceError::ApiKeyNotFound);
        }

        self.repository
            .merchants(model_id, api_key_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, model_id, "marketplace merchant lookup failed");
                MarketplaceServiceError::Internal
            })
    }

    pub async fn update_route(
        &self,
        user_id: UserId,
        api_key_id: String,
        model_id: i64,
        merchant_id: String,
        is_in_route: bool,
        is_pinned: bool,
    ) -> Result<MarketplaceRouteState, MarketplaceServiceError> {
        validate_model_id(model_id)?;
        let api_key_id = parse_uuid(api_key_id)?;
        let merchant_id = parse_uuid(merchant_id)?;
        self.repository
            .update_route(
                user_id,
                api_key_id,
                model_id,
                merchant_id,
                is_in_route,
                is_pinned,
            )
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    user_id,
                    model_id,
                    merchant_id = %merchant_id,
                    "marketplace route update failed"
                );
                MarketplaceServiceError::Internal
            })
            .and_then(|result| match result {
                MarketplaceRouteMutationResult::ApiKeyNotFound => {
                    Err(MarketplaceServiceError::ApiKeyNotFound)
                }
                MarketplaceRouteMutationResult::MerchantNotFound => {
                    Err(MarketplaceServiceError::MerchantNotFound)
                }
                MarketplaceRouteMutationResult::Updated(state) => Ok(state),
            })
    }
}

fn validate_model_id(model_id: i64) -> Result<(), MarketplaceServiceError> {
    (model_id > 0)
        .then_some(())
        .ok_or(MarketplaceServiceError::InvalidInput)
}

fn parse_uuid(value: String) -> Result<Uuid, MarketplaceServiceError> {
    Uuid::parse_str(value.trim()).map_err(|_| MarketplaceServiceError::InvalidInput)
}

#[cfg(test)]
#[path = "../../tests/unit/services_marketplace.rs"]
mod tests;

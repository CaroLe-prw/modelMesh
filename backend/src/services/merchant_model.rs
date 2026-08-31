use std::{collections::HashSet, time::Duration};

use uuid::Uuid;

use crate::{
    domain::{
        AccountRole, MerchantChannelStatus, MerchantModel, MerchantModelOption,
        MerchantModelOptions, MerchantModelStatus, MerchantPriceCurrency, ModelPriceRates,
        ModelPricing, ModelStatus, PriceCurrency, PriceExchangeRate, UserId,
        price_increase_exceeds_basis_points, price_per_million_to_nano,
    },
    repository::{
        MerchantChannelRepository, MerchantModelPriceMutation, MerchantModelRepository,
        ModelRepository, NewMerchantModelRecord, PriceSettingsRepository, RepositoryConflict,
        RepositoryError, UpdateMerchantModelRecord,
    },
};

use super::{
    authorization::require_merchant,
    model::{ModelPriceOverrideInput, resolve_pricing_overrides},
};

#[derive(Clone)]
pub struct MerchantModelService {
    repository: MerchantModelRepository,
    channel_repository: MerchantChannelRepository,
    model_repository: ModelRepository,
    price_settings_repository: PriceSettingsRepository,
}

#[derive(Clone)]
pub struct MerchantModelPriceActivationService {
    repository: MerchantModelRepository,
}

impl MerchantModelPriceActivationService {
    pub fn new(repository: MerchantModelRepository) -> Self {
        Self { repository }
    }

    pub async fn run(self, interval: Duration) {
        self.apply_due_prices().await;
        let mut ticker = tokio::time::interval(interval);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        ticker.tick().await;
        loop {
            ticker.tick().await;
            self.apply_due_prices().await;
        }
    }

    async fn apply_due_prices(&self) {
        match self.repository.apply_due_price_updates(None).await {
            Ok(0) => {}
            Ok(updated) => {
                tracing::info!(updated, "approved merchant model prices activated");
            }
            Err(error) => {
                tracing::error!(%error, "merchant model price activation failed");
            }
        }
    }
}

pub struct CreateMerchantModel {
    pub channel_id: String,
    pub conversion_mode: MerchantPriceConversionMode,
    pub exchange_rate: String,
    pub model_id: i64,
    pub input_price: String,
    pub output_price: String,
    pub price_currency: String,
    pub price_overrides: Vec<ModelPriceOverrideInput>,
}

pub struct UpdateMerchantModel {
    pub channel_id: String,
    pub conversion_mode: MerchantPriceConversionMode,
    pub exchange_rate: String,
    pub model_id: i64,
    pub input_price: String,
    pub output_price: String,
    pub price_currency: String,
    pub price_overrides: Vec<ModelPriceOverrideInput>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantPriceConversionMode {
    Parity,
    FixedRate,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantModelServiceError {
    Forbidden,
    InvalidInput,
    AlreadyExists,
    ChannelNotFound,
    ChannelPendingReview,
    ModelNotFound,
    ProviderMismatch,
    PriceSettingsChanged,
    NotFound,
    Internal,
}

impl MerchantModelService {
    pub fn new(
        repository: MerchantModelRepository,
        channel_repository: MerchantChannelRepository,
        model_repository: ModelRepository,
        price_settings_repository: PriceSettingsRepository,
    ) -> Self {
        Self {
            repository,
            channel_repository,
            model_repository,
            price_settings_repository,
        }
    }

    pub async fn list(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
    ) -> Result<Vec<MerchantModel>, MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        self.repository
            .list_by_user(user_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, "merchant model list failed");
                MerchantModelServiceError::Internal
            })
    }

    pub async fn list_options(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        channel_id: &str,
    ) -> Result<MerchantModelOptions, MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        validate_uuid(channel_id)?;
        let channel = self.find_channel(user_id, channel_id).await?;
        require_approved_channel(channel.status)?;
        let models = self
            .model_repository
            .list_published_by_brand(&channel.provider_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, channel_id, "merchant model options failed");
                MerchantModelServiceError::Internal
            })?;
        let supported_models = channel
            .supported_models
            .iter()
            .map(String::as_str)
            .collect::<HashSet<_>>();
        let price_settings = self.load_price_settings(user_id, "options").await?;
        let models = models
            .into_iter()
            .filter(|model| {
                supported_models.is_empty() || supported_models.contains(model.identifier.as_str())
            })
            .map(|model| {
                let pricing = effective_model_pricing(&model);
                MerchantModelOption {
                    id: model.id,
                    identifier: model.identifier,
                    name: model.name,
                    context_window: model.context_window,
                    input_price_nano_per_million: model.input_price_nano_usd_per_million,
                    output_price_nano_per_million: model.output_price_nano_usd_per_million,
                    pricing,
                }
            })
            .collect();

        Ok(MerchantModelOptions {
            models,
            price_settings,
        })
    }

    pub async fn create(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        request: CreateMerchantModel,
    ) -> Result<MerchantModel, MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        let record = self
            .resolve_record(
                user_id,
                request.channel_id,
                request.conversion_mode,
                request.price_currency,
                request.exchange_rate,
                request.model_id,
                request.input_price,
                request.output_price,
                request.price_overrides,
            )
            .await?;

        self.repository
            .create(NewMerchantModelRecord {
                id: Uuid::new_v4().hyphenated().to_string(),
                merchant_user_id: user_id,
                channel_id: record.channel_id,
                model_id: record.model_id,
                context_window: record.context_window,
                price_currency: record.price_currency,
                input_price_nano_per_million: record.input_price_nano_per_million,
                output_price_nano_per_million: record.output_price_nano_per_million,
                pricing_nano: record.pricing_nano,
            })
            .await
            .map_err(|error| map_write_error(error, user_id, "create"))
    }

    pub async fn update(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        listing_id: &str,
        request: UpdateMerchantModel,
    ) -> Result<MerchantModel, MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        validate_uuid(listing_id)?;
        let current = self
            .repository
            .find_by_user_and_id(user_id, listing_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, listing_id, "merchant model update lookup failed");
                MerchantModelServiceError::Internal
            })?
            .ok_or(MerchantModelServiceError::NotFound)?;
        let record = self
            .resolve_record(
                user_id,
                request.channel_id,
                request.conversion_mode,
                request.price_currency,
                request.exchange_rate,
                request.model_id,
                request.input_price,
                request.output_price,
                request.price_overrides,
            )
            .await?;
        if current.channel_id != record.channel_id || current.model_id != record.model_id {
            return Err(MerchantModelServiceError::InvalidInput);
        }
        let mutation = if current.has_approved_price {
            let review_settings = self
                .price_settings_repository
                .review_settings()
                .await
                .map_err(|error| {
                    tracing::error!(error = %error, user_id, listing_id, "merchant model price review settings lookup failed");
                    MerchantModelServiceError::Internal
                })?;
            resolve_price_mutation(
                true,
                &current.pricing,
                &record.pricing_nano,
                review_settings.price_increase_review_threshold_bps,
            )
        } else {
            resolve_price_mutation(false, &current.pricing, &record.pricing_nano, 0)
        };

        self.repository
            .update(user_id, listing_id, record, mutation)
            .await
            .map_err(|error| map_write_error(error, user_id, "update"))?
            .ok_or(MerchantModelServiceError::NotFound)
    }

    pub async fn delete(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        listing_id: &str,
    ) -> Result<(), MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        validate_uuid(listing_id)?;
        let deleted = self
            .repository
            .delete(user_id, listing_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, listing_id, "merchant model deletion failed");
                MerchantModelServiceError::Internal
            })?;

        deleted
            .then_some(())
            .ok_or(MerchantModelServiceError::NotFound)
    }

    pub async fn update_status(
        &self,
        user_id: UserId,
        requester_role: AccountRole,
        listing_id: &str,
        requested_status: MerchantModelStatus,
    ) -> Result<MerchantModel, MerchantModelServiceError> {
        require_merchant(requester_role, MerchantModelServiceError::Forbidden)?;
        validate_uuid(listing_id)?;
        let current = self
            .repository
            .find_by_user_and_id(user_id, listing_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, listing_id, "merchant model status lookup failed");
                MerchantModelServiceError::Internal
            })?
            .ok_or(MerchantModelServiceError::NotFound)?;
        let status = resolve_runtime_status(current.has_approved_price, requested_status)?;

        self.repository
            .update_status(user_id, listing_id, status)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, listing_id, "merchant model status update failed");
                MerchantModelServiceError::Internal
            })?
            .ok_or(MerchantModelServiceError::NotFound)
    }

    async fn resolve_record(
        &self,
        user_id: UserId,
        channel_id: String,
        conversion_mode: MerchantPriceConversionMode,
        price_currency: String,
        submitted_exchange_rate: String,
        model_id: i64,
        input_price: String,
        output_price: String,
        price_overrides: Vec<ModelPriceOverrideInput>,
    ) -> Result<UpdateMerchantModelRecord, MerchantModelServiceError> {
        validate_uuid(&channel_id)?;
        if model_id <= 0 {
            return Err(MerchantModelServiceError::InvalidInput);
        }
        let channel = self.find_channel(user_id, &channel_id).await?;
        require_approved_channel(channel.status)?;
        let model = self
            .model_repository
            .find_by_id(model_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, model_id, "merchant model target lookup failed");
                MerchantModelServiceError::Internal
            })?
            .ok_or(MerchantModelServiceError::ModelNotFound)?;
        if model.status != ModelStatus::Published {
            return Err(MerchantModelServiceError::ModelNotFound);
        }
        if channel.provider_id != model.brand_identifier {
            return Err(MerchantModelServiceError::ProviderMismatch);
        }
        let price_settings = self.load_price_settings(user_id, "save").await?;
        let configured_exchange_rates = price_settings
            .iter()
            .map(|settings| settings.exchange_rate)
            .collect::<Vec<_>>();
        let exchange_rate = resolve_conversion_exchange_rate(
            &configured_exchange_rates,
            &price_currency,
            &submitted_exchange_rate,
            conversion_mode,
        )?;
        let input_price_nano = parse_price(&input_price)?;
        let output_price_nano = parse_price(&output_price)?;
        let mut submitted_pricing = resolve_pricing_overrides(price_overrides)
            .map_err(|_| MerchantModelServiceError::InvalidInput)?;
        submitted_pricing
            .base
            .insert("input".to_owned(), input_price_nano);
        submitted_pricing
            .base
            .insert("output".to_owned(), output_price_nano);
        let submitted_pricing = exchange_rate
            .pricing_currency_to_usd(submitted_pricing)
            .ok_or(MerchantModelServiceError::InvalidInput)?;
        let input_price_nano_per_million = exchange_rate
            .currency_nano_to_usd(input_price_nano)
            .ok_or(MerchantModelServiceError::InvalidInput)?;
        let output_price_nano_per_million = exchange_rate
            .currency_nano_to_usd(output_price_nano)
            .ok_or(MerchantModelServiceError::InvalidInput)?;
        let model_pricing = effective_model_pricing(&model);
        if !pricing_shape_is_supported(&model_pricing, &submitted_pricing) {
            return Err(MerchantModelServiceError::InvalidInput);
        }
        let pricing_nano = model_pricing.merged_with_supported(&submitted_pricing);

        Ok(UpdateMerchantModelRecord {
            channel_id,
            model_id,
            context_window: model.context_window,
            price_currency: MerchantPriceCurrency::Usd,
            input_price_nano_per_million,
            output_price_nano_per_million,
            pricing_nano,
        })
    }

    async fn find_channel(
        &self,
        user_id: UserId,
        channel_id: &str,
    ) -> Result<crate::domain::MerchantChannel, MerchantModelServiceError> {
        self.channel_repository
            .find_by_user_and_id(user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, user_id, channel_id, "merchant model channel lookup failed");
                MerchantModelServiceError::Internal
            })?
            .ok_or(MerchantModelServiceError::ChannelNotFound)
    }

    async fn load_price_settings(
        &self,
        user_id: UserId,
        operation: &'static str,
    ) -> Result<Vec<crate::domain::PriceSettings>, MerchantModelServiceError> {
        self.price_settings_repository
            .list()
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    user_id,
                    operation,
                    "merchant model price settings lookup failed"
                );
                MerchantModelServiceError::Internal
            })
    }
}

fn validate_uuid(value: &str) -> Result<(), MerchantModelServiceError> {
    Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| MerchantModelServiceError::InvalidInput)
}

fn require_approved_channel(
    status: MerchantChannelStatus,
) -> Result<(), MerchantModelServiceError> {
    status
        .is_approved()
        .then_some(())
        .ok_or(MerchantModelServiceError::ChannelPendingReview)
}

fn resolve_runtime_status(
    has_approved_price: bool,
    requested_status: MerchantModelStatus,
) -> Result<MerchantModelStatus, MerchantModelServiceError> {
    has_approved_price
        .then_some(requested_status)
        .ok_or(MerchantModelServiceError::InvalidInput)
}

fn resolve_price_mutation(
    has_approved_price: bool,
    current: &ModelPricing,
    proposed: &ModelPricing,
    review_threshold_basis_points: i64,
) -> MerchantModelPriceMutation {
    if !has_approved_price {
        MerchantModelPriceMutation::ReplaceInitialSubmission
    } else if price_increase_exceeds_basis_points(current, proposed, review_threshold_basis_points)
    {
        MerchantModelPriceMutation::SubmitForReview
    } else {
        MerchantModelPriceMutation::ApplyImmediately
    }
}

fn parse_price(value: &str) -> Result<i64, MerchantModelServiceError> {
    price_per_million_to_nano(value.trim()).ok_or(MerchantModelServiceError::InvalidInput)
}

fn parse_exchange_rate_snapshot(
    currency: &str,
    exchange_rate: &str,
) -> Result<PriceExchangeRate, MerchantModelServiceError> {
    let currency = PriceCurrency::parse(currency).ok_or(MerchantModelServiceError::InvalidInput)?;
    PriceExchangeRate::parse(currency, exchange_rate).ok_or(MerchantModelServiceError::InvalidInput)
}

fn resolve_conversion_exchange_rate(
    configured_exchange_rates: &[PriceExchangeRate],
    currency: &str,
    submitted_exchange_rate: &str,
    conversion_mode: MerchantPriceConversionMode,
) -> Result<PriceExchangeRate, MerchantModelServiceError> {
    let submitted_exchange_rate = parse_exchange_rate_snapshot(currency, submitted_exchange_rate)?;
    let configured_exchange_rate = configured_exchange_rates
        .iter()
        .find(|rate| rate.currency() == submitted_exchange_rate.currency())
        .copied()
        .ok_or(MerchantModelServiceError::PriceSettingsChanged)?;
    let expected_exchange_rate = match conversion_mode {
        MerchantPriceConversionMode::Parity => {
            PriceExchangeRate::parse(submitted_exchange_rate.currency(), "1")
                .ok_or(MerchantModelServiceError::InvalidInput)?
        }
        MerchantPriceConversionMode::FixedRate => configured_exchange_rate,
    };

    (submitted_exchange_rate == expected_exchange_rate)
        .then_some(submitted_exchange_rate)
        .ok_or(MerchantModelServiceError::PriceSettingsChanged)
}

fn effective_model_pricing(model: &crate::domain::ManagedModel) -> ModelPricing {
    model
        .default_pricing
        .merged_with(&model.pricing_overrides)
        .with_required_base_prices(
            model.input_price_nano_usd_per_million,
            model.output_price_nano_usd_per_million,
        )
}

fn pricing_shape_is_supported(reference: &ModelPricing, submitted: &ModelPricing) -> bool {
    rates_are_supported(&reference.base, &submitted.base)
        && submitted.context_over_200k.as_ref().is_none_or(|rates| {
            reference
                .context_over_200k
                .as_ref()
                .is_some_and(|reference_rates| rates_are_supported(reference_rates, rates))
        })
        && submitted.tiers.iter().all(|tier| {
            reference
                .tiers
                .iter()
                .find(|candidate| {
                    candidate.tier_type == tier.tier_type && candidate.size == tier.size
                })
                .is_some_and(|reference_tier| {
                    rates_are_supported(&reference_tier.rates, &tier.rates)
                })
        })
        && named_rates_are_supported(&reference.experimental_modes, &submitted.experimental_modes)
        && named_tiers_are_supported(
            &reference.experimental_mode_tiers,
            &submitted.experimental_mode_tiers,
        )
        && named_rates_are_supported(&reference.service_tiers, &submitted.service_tiers)
}

fn named_tiers_are_supported(
    reference: &std::collections::BTreeMap<String, Vec<crate::domain::ModelPriceTier>>,
    submitted: &std::collections::BTreeMap<String, Vec<crate::domain::ModelPriceTier>>,
) -> bool {
    submitted.iter().all(|(name, tiers)| {
        reference.get(name).is_some_and(|reference_tiers| {
            tiers.iter().all(|tier| {
                reference_tiers
                    .iter()
                    .find(|candidate| {
                        candidate.tier_type == tier.tier_type && candidate.size == tier.size
                    })
                    .is_some_and(|reference_tier| {
                        rates_are_supported(&reference_tier.rates, &tier.rates)
                    })
            })
        })
    })
}

fn named_rates_are_supported(
    reference: &std::collections::BTreeMap<String, ModelPriceRates>,
    submitted: &std::collections::BTreeMap<String, ModelPriceRates>,
) -> bool {
    submitted.iter().all(|(name, rates)| {
        reference
            .get(name)
            .is_some_and(|reference_rates| rates_are_supported(reference_rates, rates))
    })
}

fn rates_are_supported(reference: &ModelPriceRates, submitted: &ModelPriceRates) -> bool {
    submitted.keys().all(|rate| reference.contains_key(rate))
}

fn map_write_error(
    error: RepositoryError,
    user_id: UserId,
    operation: &'static str,
) -> MerchantModelServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::MerchantModelListing)
    ) {
        return MerchantModelServiceError::AlreadyExists;
    }

    tracing::error!(error = %error, user_id, operation, "merchant model write failed");
    MerchantModelServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_model.rs"]
mod tests;

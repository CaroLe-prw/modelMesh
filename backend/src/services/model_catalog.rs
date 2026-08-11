use std::{
    collections::{BTreeMap, HashMap},
    fmt,
    time::Duration,
};

use serde_json::{Map, Number, Value};

use crate::{
    clients::{ModelsDevCatalogEntry, ModelsDevClient, ModelsDevClientError},
    domain::{
        AccountRole, ModelCatalogEntry, ModelPriceRates, ModelPriceTier, ModelPricing,
        usd_per_million_to_nano,
    },
    repository::{ModelCatalogRepository, NewModelCatalogEntry, RepositoryError},
};

use super::authorization::require_admin;

const MAX_BRAND_IDENTIFIER_LENGTH: usize = 64;
const MAX_MODEL_ID_LENGTH: usize = 160;
const MAX_MODEL_NAME_LENGTH: usize = 200;
const MAX_SYNC_POLL_SECONDS: u64 = 60 * 60;

#[derive(Clone)]
pub struct ModelCatalogService {
    repository: ModelCatalogRepository,
}

#[derive(Clone)]
pub struct ModelCatalogSyncService {
    client: ModelsDevClient,
    repository: ModelCatalogRepository,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModelCatalogServiceError {
    Forbidden,
    InvalidInput,
    NotFound,
    Internal,
}

#[derive(Debug)]
pub enum ModelCatalogSyncError {
    EmptyCatalog,
    InvalidCatalog,
    Repository(RepositoryError),
    Source(ModelsDevClientError),
}

impl ModelCatalogService {
    pub fn new(repository: ModelCatalogRepository) -> Self {
        Self { repository }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        brand_identifier: String,
    ) -> Result<Vec<ModelCatalogEntry>, ModelCatalogServiceError> {
        require_admin(requester_role, ModelCatalogServiceError::Forbidden)?;
        let brand_identifier = normalize_identifier(brand_identifier)?;

        self.repository
            .list_by_brand(&brand_identifier)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    brand_identifier,
                    "model catalog list failed"
                );
                ModelCatalogServiceError::Internal
            })
    }

    pub async fn lookup(
        &self,
        requester_role: AccountRole,
        brand_identifier: String,
        model_id: String,
    ) -> Result<ModelCatalogEntry, ModelCatalogServiceError> {
        require_admin(requester_role, ModelCatalogServiceError::Forbidden)?;
        let brand_identifier = normalize_identifier(brand_identifier)?;
        let model_id = normalize_model_id(model_id)?;

        self.repository
            .find_by_brand_and_model(&brand_identifier, &model_id)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    brand_identifier,
                    model_id,
                    "model catalog lookup failed"
                );
                ModelCatalogServiceError::Internal
            })?
            .ok_or(ModelCatalogServiceError::NotFound)
    }
}

impl ModelCatalogSyncService {
    pub fn new(repository: ModelCatalogRepository, client: ModelsDevClient) -> Self {
        Self { client, repository }
    }

    pub async fn run(self, sync_interval_seconds: u64) {
        self.log_sync_result(self.synchronize().await, sync_interval_seconds, true);

        let poll_seconds = sync_interval_seconds.min(MAX_SYNC_POLL_SECONDS);
        let mut interval = tokio::time::interval(Duration::from_secs(poll_seconds));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        interval.tick().await;

        loop {
            interval.tick().await;
            let result = self.sync_if_due(sync_interval_seconds).await;
            match result {
                Ok(Some(entry_count)) => {
                    self.log_sync_result(Ok(entry_count), sync_interval_seconds, false)
                }
                Ok(None) => {}
                Err(error) => self.log_sync_result(Err(error), sync_interval_seconds, false),
            }
        }
    }

    fn log_sync_result(
        &self,
        result: Result<usize, ModelCatalogSyncError>,
        sync_interval_seconds: u64,
        startup_refresh: bool,
    ) {
        match result {
            Ok(entry_count) => {
                tracing::info!(
                    source = "models.dev",
                    entry_count,
                    sync_interval_seconds,
                    startup_refresh,
                    "model catalog synchronized"
                );
            }
            Err(error) => {
                tracing::warn!(
                    source = "models.dev",
                    error = %error,
                    startup_refresh,
                    "model catalog synchronization failed; the previous cache remains active"
                );
            }
        }
    }

    async fn sync_if_due(
        &self,
        sync_interval_seconds: u64,
    ) -> Result<Option<usize>, ModelCatalogSyncError> {
        let is_due = self
            .repository
            .is_models_dev_sync_due(sync_interval_seconds)
            .await
            .map_err(ModelCatalogSyncError::Repository)?;
        if !is_due {
            return Ok(None);
        }

        self.synchronize().await.map(Some)
    }

    async fn synchronize(&self) -> Result<usize, ModelCatalogSyncError> {
        let source_entries = self
            .client
            .fetch_catalog()
            .await
            .map_err(ModelCatalogSyncError::Source)?;
        if source_entries.is_empty() {
            return Err(ModelCatalogSyncError::EmptyCatalog);
        }
        let entries = normalize_catalog(source_entries)?;
        if entries.is_empty() {
            return Err(ModelCatalogSyncError::InvalidCatalog);
        }
        let entry_count = self
            .repository
            .replace_models_dev_catalog(&entries)
            .await
            .map_err(ModelCatalogSyncError::Repository)?;

        Ok(entry_count)
    }
}

impl fmt::Display for ModelCatalogSyncError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCatalog => formatter.write_str("models.dev returned an empty catalog"),
            Self::InvalidCatalog => {
                formatter.write_str("models.dev catalog contained no valid entries")
            }
            Self::Repository(error) => error.fmt(formatter),
            Self::Source(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for ModelCatalogSyncError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Source(error) => Some(error),
            Self::Repository(error) => Some(error),
            Self::EmptyCatalog | Self::InvalidCatalog => None,
        }
    }
}

fn normalize_catalog(
    entries: Vec<ModelsDevCatalogEntry>,
) -> Result<Vec<NewModelCatalogEntry>, ModelCatalogSyncError> {
    let mut normalized = HashMap::with_capacity(entries.len());

    for entry in entries {
        let provider_id = entry.provider_id.trim().to_ascii_lowercase();
        let model_id = entry.model_id.trim().to_owned();
        let model_name = entry.model_name.trim().to_owned();
        if provider_id.is_empty()
            || provider_id.len() > MAX_BRAND_IDENTIFIER_LENGTH
            || !provider_id
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
            || model_id.is_empty()
            || model_id.len() > MAX_MODEL_ID_LENGTH
            || model_id.chars().any(char::is_control)
            || model_name.is_empty()
            || model_name.chars().count() > MAX_MODEL_NAME_LENGTH
            || model_name.chars().any(char::is_control)
        {
            continue;
        }

        let pricing_nano_usd =
            normalize_model_pricing(entry.raw_cost.as_ref(), &entry.source_data)?;
        let record = NewModelCatalogEntry {
            provider_id: provider_id.clone(),
            model_id: model_id.clone(),
            model_name,
            context_window: entry.context_window.filter(|value| *value > 0),
            cache_read_price_nano_usd_per_million: pricing_nano_usd.base.get("cache_read").copied(),
            cache_write_price_nano_usd_per_million: pricing_nano_usd
                .base
                .get("cache_write")
                .copied(),
            input_price_nano_usd_per_million: pricing_nano_usd.base.get("input").copied(),
            output_price_nano_usd_per_million: pricing_nano_usd.base.get("output").copied(),
            pricing_nano_usd,
            source_data: entry.source_data,
        };
        normalized.insert((provider_id, model_id), record);
    }

    Ok(normalized.into_values().collect())
}

fn normalize_model_pricing(
    raw_cost: Option<&Value>,
    source_data: &Value,
) -> Result<ModelPricing, ModelCatalogSyncError> {
    let mut pricing = ModelPricing::default();

    if let Some(cost) = raw_cost {
        let cost = cost
            .as_object()
            .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
        pricing.base = price_rates(cost, &["context_over_200k", "tiers"])?;
        pricing.tiers = cost
            .get("tiers")
            .map(normalize_price_tiers)
            .transpose()?
            .unwrap_or_default();
        if pricing.tiers.is_empty() {
            pricing.context_over_200k = cost
                .get("context_over_200k")
                .map(|value| {
                    value
                        .as_object()
                        .ok_or(ModelCatalogSyncError::InvalidCatalog)
                        .and_then(|cost| price_rates(cost, &[]))
                })
                .transpose()?;
        }
    }

    if let Some(modes) = source_data
        .get("experimental")
        .and_then(|value| value.get("modes"))
        .and_then(Value::as_object)
    {
        for (mode, configuration) in modes {
            let Some(cost) = configuration.get("cost") else {
                continue;
            };
            let cost = cost
                .as_object()
                .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
            pricing
                .experimental_modes
                .insert(mode.clone(), price_rates(cost, &[])?);
        }
    }

    Ok(pricing)
}

fn normalize_price_tiers(value: &Value) -> Result<Vec<ModelPriceTier>, ModelCatalogSyncError> {
    let tiers = value
        .as_array()
        .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
    let mut normalized = Vec::with_capacity(tiers.len());

    for value in tiers {
        let tier = value
            .as_object()
            .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
        let condition = tier
            .get("tier")
            .and_then(Value::as_object)
            .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
        let tier_type = condition
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or("context")
            .to_owned();
        let size = condition
            .get("size")
            .and_then(Value::as_i64)
            .filter(|size| *size >= 0)
            .ok_or(ModelCatalogSyncError::InvalidCatalog)?;
        normalized.push(ModelPriceTier {
            tier_type,
            size,
            rates: price_rates(tier, &["tier"])?,
        });
    }
    normalized.sort_by(|left, right| {
        left.size
            .cmp(&right.size)
            .then(left.tier_type.cmp(&right.tier_type))
    });

    Ok(normalized)
}

fn price_rates(
    cost: &Map<String, Value>,
    excluded: &[&str],
) -> Result<ModelPriceRates, ModelCatalogSyncError> {
    let mut rates = BTreeMap::new();
    for (name, value) in cost {
        if excluded.contains(&name.as_str()) {
            continue;
        }
        let Some(number) = value.as_number() else {
            return Err(ModelCatalogSyncError::InvalidCatalog);
        };
        let price =
            price_number_to_nano_usd(number).ok_or(ModelCatalogSyncError::InvalidCatalog)?;
        rates.insert(name.clone(), price);
    }
    Ok(rates)
}

fn price_number_to_nano_usd(value: &Number) -> Option<i64> {
    usd_per_million_to_nano(&value.to_string())
}

fn normalize_identifier(value: String) -> Result<String, ModelCatalogServiceError> {
    let value = value.trim().to_ascii_lowercase();
    (!value.is_empty()
        && value.len() <= MAX_BRAND_IDENTIFIER_LENGTH
        && value
            .split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_alphanumeric())))
    .then_some(value)
    .ok_or(ModelCatalogServiceError::InvalidInput)
}

fn normalize_model_id(value: String) -> Result<String, ModelCatalogServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty()
        && value.len() <= MAX_MODEL_ID_LENGTH
        && !value.chars().any(char::is_control))
    .then_some(value)
    .ok_or(ModelCatalogServiceError::InvalidInput)
}

#[cfg(test)]
#[path = "../../tests/unit/services_model_catalog.rs"]
mod tests;

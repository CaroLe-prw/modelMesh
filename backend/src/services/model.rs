use std::collections::{HashMap, HashSet};

use crate::{
    domain::{
        AccountRole, ManagedModel, ModelCatalogEntry, ModelPriceTier, ModelPricing, ModelStatus,
        Page, Pagination, usd_per_million_to_nano,
    },
    repository::{
        ModelCatalogRepository, ModelRepository, ModelSearch, NewModelRecord, RepositoryConflict,
        RepositoryError, UpdateModelPricingRecord,
    },
};

use super::authorization::require_admin;

const MAX_BRAND_IDENTIFIER_LENGTH: usize = 64;
const MAX_MODEL_IDENTIFIER_LENGTH: usize = 160;
const MAX_MODEL_NAME_LENGTH: usize = 200;
const MAX_PRICE_OVERRIDES: usize = 256;
const MAX_PRICE_RATE_LENGTH: usize = 64;
const MAX_PRICE_GROUP_NAME_LENGTH: usize = 80;
const MAX_SEARCH_QUERY_LENGTH: usize = 256;
const MAX_MODELS_PER_BATCH: usize = 100;
const DEFAULT_CUSTOM_CONTEXT_WINDOW: i64 = 128_000;

#[derive(Clone)]
pub struct ModelService {
    repository: ModelRepository,
    catalog_repository: ModelCatalogRepository,
}

pub struct CreateModel {
    pub brand_identifier: String,
    pub identifier: String,
    pub name: Option<String>,
    pub context_window: Option<i64>,
    pub input_price: Option<f64>,
    pub cache_read_price: Option<f64>,
    pub cache_write_price: Option<f64>,
    pub output_price: Option<f64>,
    pub price_overrides: Vec<ModelPriceOverrideInput>,
    pub status: ModelStatus,
}

pub struct CreateCatalogModels {
    pub brand_identifier: String,
    pub model_identifiers: Vec<String>,
    pub input_price: Option<f64>,
    pub cache_read_price: Option<f64>,
    pub cache_write_price: Option<f64>,
    pub output_price: Option<f64>,
    pub price_overrides: Vec<ModelPriceOverrideInput>,
    pub status: ModelStatus,
}

#[derive(Clone)]
pub struct ModelPriceOverrideInput {
    pub group: ModelPriceGroupInput,
    pub rate: String,
    pub price: String,
}

pub struct UpdateModelPricing {
    pub price_overrides: Vec<ModelPriceOverrideInput>,
}

#[derive(Clone)]
pub enum ModelPriceGroupInput {
    Base,
    ContextOver200k,
    Tier { tier_type: String, size: i64 },
    ExperimentalMode { mode: String },
    ServiceTier { tier: String },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModelServiceError {
    Forbidden,
    InvalidInput,
    AlreadyExists,
    BrandNotFound,
    NotFound,
    Internal,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct ResolvedPrice {
    value: i64,
    overridden: bool,
}

impl ModelService {
    pub fn new(repository: ModelRepository, catalog_repository: ModelCatalogRepository) -> Self {
        Self {
            repository,
            catalog_repository,
        }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        pagination: Pagination,
        query: Option<String>,
        brand_identifier: Option<String>,
        status: Option<ModelStatus>,
    ) -> Result<Page<ManagedModel>, ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        let search = ModelSearch {
            pattern: build_search_pattern(query)?,
            brand_identifier: brand_identifier
                .map(normalize_brand_identifier)
                .transpose()?,
            status,
        };

        self.repository
            .list(&search, pagination)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "model list failed");
                ModelServiceError::Internal
            })
    }

    pub async fn create(
        &self,
        requester_role: AccountRole,
        request: CreateModel,
    ) -> Result<ManagedModel, ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        let brand_identifier = normalize_brand_identifier(request.brand_identifier.clone())?;
        let requested_identifier = normalize_catalog_lookup_id(request.identifier.clone())?;
        let catalog_entry = self
            .catalog_repository
            .find_by_brand_and_model(&brand_identifier, &requested_identifier)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    brand_identifier,
                    model_identifier = requested_identifier,
                    "model catalog resolution failed"
                );
                ModelServiceError::Internal
            })?;
        let record = resolve_new_model(brand_identifier, request, catalog_entry)?;

        self.repository
            .create(record)
            .await
            .map_err(map_repository_write_error)?
            .ok_or(ModelServiceError::BrandNotFound)
    }

    pub async fn create_catalog_models(
        &self,
        requester_role: AccountRole,
        mut request: CreateCatalogModels,
    ) -> Result<Vec<ManagedModel>, ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        request.brand_identifier = normalize_brand_identifier(request.brand_identifier)?;
        if request.model_identifiers.is_empty()
            || request.model_identifiers.len() > MAX_MODELS_PER_BATCH
        {
            return Err(ModelServiceError::InvalidInput);
        }
        let catalog_entries = self
            .catalog_repository
            .list_by_brand(&request.brand_identifier)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    brand_identifier = request.brand_identifier,
                    "model catalog batch resolution failed"
                );
                ModelServiceError::Internal
            })?;
        let records = resolve_catalog_model_records(request, catalog_entries)?;

        self.repository
            .create_many(records)
            .await
            .map_err(map_repository_write_error)?
            .ok_or(ModelServiceError::BrandNotFound)
    }

    pub async fn update_status(
        &self,
        requester_role: AccountRole,
        id: i64,
        status: ModelStatus,
    ) -> Result<ManagedModel, ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        ensure_model_id(id)?;

        self.repository
            .update_status(id, status)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    model_id = id,
                    "model status update failed"
                );
                ModelServiceError::Internal
            })?
            .ok_or(ModelServiceError::NotFound)
    }

    pub async fn delete(
        &self,
        requester_role: AccountRole,
        id: i64,
    ) -> Result<(), ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        ensure_model_id(id)?;

        let deleted = self.repository.delete(id).await.map_err(|error| {
            tracing::error!(error = %error, model_id = id, "model deletion failed");
            ModelServiceError::Internal
        })?;
        deleted.then_some(()).ok_or(ModelServiceError::NotFound)
    }

    pub async fn update_pricing(
        &self,
        requester_role: AccountRole,
        id: i64,
        request: UpdateModelPricing,
    ) -> Result<ManagedModel, ModelServiceError> {
        require_admin(requester_role, ModelServiceError::Forbidden)?;
        ensure_model_id(id)?;
        let pricing_overrides_nano_usd = resolve_pricing_overrides(request.price_overrides)?;

        self.repository
            .update_pricing(
                id,
                UpdateModelPricingRecord {
                    pricing_overrides_nano_usd,
                },
            )
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    model_id = id,
                    "model pricing update failed"
                );
                ModelServiceError::Internal
            })?
            .ok_or(ModelServiceError::NotFound)
    }
}

fn resolve_new_model(
    brand_identifier: String,
    request: CreateModel,
    catalog_entry: Option<ModelCatalogEntry>,
) -> Result<NewModelRecord, ModelServiceError> {
    let (identifier, name, catalog_source, catalog_provider_id, catalog_model_id, context_window) =
        match catalog_entry.as_ref() {
            Some(entry) => (
                entry.model_id.clone(),
                entry.model_name.clone(),
                Some("models.dev".to_owned()),
                Some(entry.provider_id.clone()),
                Some(entry.model_id.clone()),
                entry
                    .context_window
                    .unwrap_or(DEFAULT_CUSTOM_CONTEXT_WINDOW),
            ),
            None => (
                normalize_custom_model_identifier(request.identifier)?,
                normalize_model_name(request.name.ok_or(ModelServiceError::InvalidInput)?)?,
                None,
                None,
                None,
                request
                    .context_window
                    .unwrap_or(DEFAULT_CUSTOM_CONTEXT_WINDOW),
            ),
        };
    if context_window <= 0 {
        return Err(ModelServiceError::InvalidInput);
    }
    let mut submitted_pricing = resolve_pricing_overrides(request.price_overrides)?;
    let (
        default_pricing,
        pricing_overrides,
        input_price,
        cache_read_price,
        cache_write_price,
        output_price,
    ) = if let Some(entry) = catalog_entry.as_ref() {
        let input_price = resolve_base_price(
            "input",
            &mut submitted_pricing,
            request.input_price,
            entry.input_price_nano_usd_per_million,
        )?;
        let cache_read_price = resolve_base_price(
            "cache_read",
            &mut submitted_pricing,
            request.cache_read_price,
            entry.cache_read_price_nano_usd_per_million,
        )?;
        let cache_write_price = resolve_base_price(
            "cache_write",
            &mut submitted_pricing,
            request.cache_write_price,
            entry.cache_write_price_nano_usd_per_million,
        )?;
        let output_price = resolve_base_price(
            "output",
            &mut submitted_pricing,
            request.output_price,
            entry.output_price_nano_usd_per_million,
        )?;
        (
            entry.pricing.clone(),
            submitted_pricing,
            input_price,
            cache_read_price,
            cache_write_price,
            output_price,
        )
    } else {
        resolve_base_price("input", &mut submitted_pricing, request.input_price, None)?;
        resolve_base_price(
            "cache_read",
            &mut submitted_pricing,
            request.cache_read_price,
            None,
        )?;
        resolve_base_price(
            "cache_write",
            &mut submitted_pricing,
            request.cache_write_price,
            None,
        )?;
        resolve_base_price("output", &mut submitted_pricing, request.output_price, None)?;
        let input_price = default_base_price(&submitted_pricing, "input");
        let cache_read_price = default_base_price(&submitted_pricing, "cache_read");
        let cache_write_price = default_base_price(&submitted_pricing, "cache_write");
        let output_price = default_base_price(&submitted_pricing, "output");
        (
            submitted_pricing,
            ModelPricing::default(),
            input_price,
            cache_read_price,
            cache_write_price,
            output_price,
        )
    };

    Ok(NewModelRecord {
        brand_identifier,
        identifier,
        name,
        catalog_source,
        catalog_provider_id,
        catalog_model_id,
        context_window,
        input_price_nano_usd_per_million: input_price.value,
        input_price_overridden: input_price.overridden,
        cache_read_price_nano_usd_per_million: cache_read_price.value,
        cache_read_price_overridden: cache_read_price.overridden,
        cache_write_price_nano_usd_per_million: cache_write_price.value,
        cache_write_price_overridden: cache_write_price.overridden,
        output_price_nano_usd_per_million: output_price.value,
        output_price_overridden: output_price.overridden,
        default_pricing_nano_usd: default_pricing,
        pricing_overrides_nano_usd: pricing_overrides,
        status: request.status,
    })
}

fn resolve_catalog_model_records(
    request: CreateCatalogModels,
    catalog_entries: Vec<ModelCatalogEntry>,
) -> Result<Vec<NewModelRecord>, ModelServiceError> {
    let catalog_by_identifier = catalog_entries
        .into_iter()
        .map(|entry| (entry.model_id.to_lowercase(), entry))
        .collect::<HashMap<_, _>>();
    let mut seen = HashSet::with_capacity(request.model_identifiers.len());
    let mut records = Vec::with_capacity(request.model_identifiers.len());

    for identifier in request.model_identifiers {
        let identifier = normalize_catalog_lookup_id(identifier)?;
        let lookup_key = identifier.to_lowercase();
        if !seen.insert(lookup_key.clone()) {
            return Err(ModelServiceError::InvalidInput);
        }
        let catalog_entry = catalog_by_identifier
            .get(&lookup_key)
            .cloned()
            .ok_or(ModelServiceError::InvalidInput)?;
        records.push(resolve_new_model(
            request.brand_identifier.clone(),
            CreateModel {
                brand_identifier: request.brand_identifier.clone(),
                identifier,
                name: None,
                context_window: None,
                input_price: request.input_price,
                cache_read_price: request.cache_read_price,
                cache_write_price: request.cache_write_price,
                output_price: request.output_price,
                price_overrides: request.price_overrides.clone(),
                status: request.status,
            },
            Some(catalog_entry),
        )?);
    }

    Ok(records)
}

fn resolve_base_price(
    rate: &str,
    pricing_overrides: &mut ModelPricing,
    legacy_manual_value: Option<f64>,
    catalog_default: Option<i64>,
) -> Result<ResolvedPrice, ModelServiceError> {
    if let Some(value) = pricing_overrides.base.get(rate).copied() {
        return Ok(ResolvedPrice {
            value,
            overridden: true,
        });
    }
    let resolved = resolve_price(legacy_manual_value, catalog_default)?;
    if resolved.overridden {
        pricing_overrides
            .base
            .insert(rate.to_owned(), resolved.value);
    }
    Ok(resolved)
}

fn default_base_price(pricing: &ModelPricing, rate: &str) -> ResolvedPrice {
    ResolvedPrice {
        value: pricing.base.get(rate).copied().unwrap_or(0),
        overridden: false,
    }
}

fn resolve_pricing_overrides(
    overrides: Vec<ModelPriceOverrideInput>,
) -> Result<ModelPricing, ModelServiceError> {
    if overrides.len() > MAX_PRICE_OVERRIDES {
        return Err(ModelServiceError::InvalidInput);
    }
    let mut pricing = ModelPricing::default();

    for price_override in overrides {
        let rate = normalize_price_name(price_override.rate, MAX_PRICE_RATE_LENGTH)?;
        let price = usd_per_million_to_nano(price_override.price.trim())
            .ok_or(ModelServiceError::InvalidInput)?;
        match price_override.group {
            ModelPriceGroupInput::Base => {
                pricing.base.insert(rate, price);
            }
            ModelPriceGroupInput::ContextOver200k => {
                pricing
                    .context_over_200k
                    .get_or_insert_default()
                    .insert(rate, price);
            }
            ModelPriceGroupInput::Tier { tier_type, size } => {
                if size < 0 {
                    return Err(ModelServiceError::InvalidInput);
                }
                let tier_type = normalize_price_name(tier_type, MAX_PRICE_GROUP_NAME_LENGTH)?;
                if let Some(tier) = pricing
                    .tiers
                    .iter_mut()
                    .find(|tier| tier.tier_type == tier_type && tier.size == size)
                {
                    tier.rates.insert(rate, price);
                } else {
                    pricing.tiers.push(ModelPriceTier {
                        tier_type,
                        size,
                        rates: [(rate, price)].into(),
                    });
                }
            }
            ModelPriceGroupInput::ExperimentalMode { mode } => {
                let mode = normalize_price_name(mode, MAX_PRICE_GROUP_NAME_LENGTH)?;
                pricing
                    .experimental_modes
                    .entry(mode)
                    .or_default()
                    .insert(rate, price);
            }
            ModelPriceGroupInput::ServiceTier { tier } => {
                let tier = normalize_price_name(tier, MAX_PRICE_GROUP_NAME_LENGTH)?;
                pricing
                    .service_tiers
                    .entry(tier)
                    .or_default()
                    .insert(rate, price);
            }
        }
    }
    pricing.tiers.sort_by(|left, right| {
        left.size
            .cmp(&right.size)
            .then(left.tier_type.cmp(&right.tier_type))
    });

    Ok(pricing)
}

fn normalize_price_name(value: String, max_length: usize) -> Result<String, ModelServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty()
        && value.len() <= max_length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_'))
    .then_some(value)
    .ok_or(ModelServiceError::InvalidInput)
}

fn resolve_price(
    manual_value: Option<f64>,
    catalog_default: Option<i64>,
) -> Result<ResolvedPrice, ModelServiceError> {
    let Some(manual_value) = manual_value else {
        return Ok(ResolvedPrice {
            value: catalog_default.unwrap_or(0),
            overridden: false,
        });
    };
    let value = usd_per_million_to_nano(&manual_value.to_string())
        .ok_or(ModelServiceError::InvalidInput)?;

    Ok(ResolvedPrice {
        value,
        overridden: true,
    })
}

fn ensure_model_id(id: i64) -> Result<(), ModelServiceError> {
    (id > 0)
        .then_some(())
        .ok_or(ModelServiceError::InvalidInput)
}

fn build_search_pattern(query: Option<String>) -> Result<Option<String>, ModelServiceError> {
    let Some(query) = query else {
        return Ok(None);
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(None);
    }
    if query.chars().count() > MAX_SEARCH_QUERY_LENGTH || query.chars().any(char::is_control) {
        return Err(ModelServiceError::InvalidInput);
    }

    Ok(Some(format!("%{}%", escape_like_pattern(query))))
}

fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

fn normalize_brand_identifier(value: String) -> Result<String, ModelServiceError> {
    let value = value.trim().to_ascii_lowercase();
    (!value.is_empty()
        && value.len() <= MAX_BRAND_IDENTIFIER_LENGTH
        && value
            .split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_alphanumeric())))
    .then_some(value)
    .ok_or(ModelServiceError::InvalidInput)
}

fn normalize_catalog_lookup_id(value: String) -> Result<String, ModelServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty()
        && value.len() <= MAX_MODEL_IDENTIFIER_LENGTH
        && !value.chars().any(char::is_control))
    .then_some(value)
    .ok_or(ModelServiceError::InvalidInput)
}

fn normalize_custom_model_identifier(value: String) -> Result<String, ModelServiceError> {
    let value = normalize_catalog_lookup_id(value)?;
    value
        .bytes()
        .all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-' | b'/' | b':')
        })
        .then_some(value)
        .ok_or(ModelServiceError::InvalidInput)
}

fn normalize_model_name(value: String) -> Result<String, ModelServiceError> {
    let value = value.trim().to_owned();
    (!value.is_empty()
        && value.chars().count() <= MAX_MODEL_NAME_LENGTH
        && !value.chars().any(char::is_control))
    .then_some(value)
    .ok_or(ModelServiceError::InvalidInput)
}

fn map_repository_write_error(error: RepositoryError) -> ModelServiceError {
    match error {
        RepositoryError::Conflict(RepositoryConflict::ModelIdentifier) => {
            ModelServiceError::AlreadyExists
        }
        _ => ModelServiceError::Internal,
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_model.rs"]
mod tests;

use std::{collections::HashMap, fmt, future::Future, time::Duration};

use serde::Deserialize;
use serde_json::Value;

const MAX_RETRY_DELAY: Duration = Duration::from_secs(60);

#[derive(Clone)]
pub struct ModelsDevClient {
    catalog_url: reqwest::Url,
    http: reqwest::Client,
    max_attempts: u32,
    retry_delay: Duration,
}

pub struct ModelsDevClientConfig {
    pub catalog_url: String,
    pub connect_timeout: Duration,
    pub max_attempts: u32,
    pub request_timeout: Duration,
    pub retry_delay: Duration,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ModelsDevCatalogEntry {
    pub provider_id: String,
    pub model_id: String,
    pub model_name: String,
    pub context_window: Option<i64>,
    pub cache_read_price_usd_per_million: Option<f64>,
    pub cache_write_price_usd_per_million: Option<f64>,
    pub input_price_usd_per_million: Option<f64>,
    pub output_price_usd_per_million: Option<f64>,
    pub raw_cost: Option<Value>,
    pub source_data: Value,
}

#[derive(Debug)]
pub enum ModelsDevClientError {
    InvalidCatalogUrl,
    Request {
        attempts: u32,
        source: reqwest::Error,
    },
}

#[derive(Debug, Deserialize)]
struct ModelsDevProvider {
    id: String,
    #[serde(default)]
    models: HashMap<String, Value>,
}

#[derive(Debug, Deserialize)]
struct ModelsDevModel {
    id: String,
    name: String,
    #[serde(default)]
    cost: Option<Value>,
    #[serde(default)]
    limit: Option<ModelsDevLimit>,
}

#[derive(Debug, Deserialize)]
struct ModelsDevLimit {
    #[serde(default)]
    context: Option<i64>,
}

impl ModelsDevClient {
    pub fn new(config: ModelsDevClientConfig) -> Result<Self, ModelsDevClientError> {
        let catalog_url = reqwest::Url::parse(&config.catalog_url)
            .map_err(|_| ModelsDevClientError::InvalidCatalogUrl)?;
        if !matches!(catalog_url.scheme(), "http" | "https") {
            return Err(ModelsDevClientError::InvalidCatalogUrl);
        }
        let http = reqwest::Client::builder()
            .connect_timeout(config.connect_timeout)
            .timeout(config.request_timeout)
            .user_agent(concat!("ModelMesh/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|source| ModelsDevClientError::Request {
                attempts: 0,
                source,
            })?;

        Ok(Self {
            catalog_url,
            http,
            max_attempts: config.max_attempts.max(1),
            retry_delay: config.retry_delay,
        })
    }

    pub async fn fetch_catalog(&self) -> Result<Vec<ModelsDevCatalogEntry>, ModelsDevClientError> {
        retry_operation(
            self.max_attempts,
            self.retry_delay,
            || self.fetch_catalog_once(),
            is_retryable,
            |attempt, max_attempts, retry_delay, error| {
                tracing::warn!(
                    source = "models.dev",
                    attempt,
                    max_attempts,
                    retry_delay_seconds = retry_delay.as_secs(),
                    error_kind = request_error_kind(error),
                    "model catalog request failed; retrying"
                );
            },
        )
        .await
        .map_err(|failure| ModelsDevClientError::Request {
            attempts: failure.attempts,
            source: failure.source,
        })
    }

    async fn fetch_catalog_once(&self) -> Result<Vec<ModelsDevCatalogEntry>, reqwest::Error> {
        let response = self
            .http
            .get(self.catalog_url.clone())
            .send()
            .await?
            .error_for_status()?;
        let providers = response
            .json::<HashMap<String, ModelsDevProvider>>()
            .await?;

        Ok(catalog_entries(providers))
    }
}

impl fmt::Display for ModelsDevClientError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCatalogUrl => formatter.write_str("models.dev catalog URL is invalid"),
            Self::Request { attempts, source } => write!(
                formatter,
                "models.dev request failed after {attempts} attempt(s): {}",
                request_error_kind(source)
            ),
        }
    }
}

impl std::error::Error for ModelsDevClientError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidCatalogUrl => None,
            Self::Request { source, .. } => Some(source),
        }
    }
}

fn is_retryable(error: &reqwest::Error) -> bool {
    error.is_connect()
        || error.is_timeout()
        || error.is_body()
        || error.status().is_some_and(|status| {
            status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
        })
}

fn request_error_kind(error: &reqwest::Error) -> &'static str {
    if error.is_connect() && error.is_timeout() {
        "connect_timeout"
    } else if error.is_connect() {
        "connect"
    } else if error.is_timeout() {
        "request_timeout"
    } else if error.is_body() {
        "response_body"
    } else if error.status() == Some(reqwest::StatusCode::TOO_MANY_REQUESTS) {
        "rate_limited"
    } else if error
        .status()
        .is_some_and(|status| status.is_server_error())
    {
        "server_error"
    } else if error.is_decode() {
        "invalid_response"
    } else {
        "request"
    }
}

fn retry_delay(base: Duration, failed_attempt: u32) -> Duration {
    let multiplier = 1_u32
        .checked_shl(failed_attempt.saturating_sub(1).min(5))
        .unwrap_or(32);
    base.checked_mul(multiplier)
        .unwrap_or(MAX_RETRY_DELAY)
        .min(MAX_RETRY_DELAY)
}

#[derive(Debug)]
struct RetryFailure<Error> {
    attempts: u32,
    source: Error,
}

async fn retry_operation<Value, Error, Operation, OperationFuture, ShouldRetry, OnRetry>(
    max_attempts: u32,
    base_delay: Duration,
    mut operation: Operation,
    should_retry: ShouldRetry,
    mut on_retry: OnRetry,
) -> Result<Value, RetryFailure<Error>>
where
    Operation: FnMut() -> OperationFuture,
    OperationFuture: Future<Output = Result<Value, Error>>,
    ShouldRetry: Fn(&Error) -> bool,
    OnRetry: FnMut(u32, u32, Duration, &Error),
{
    let max_attempts = max_attempts.max(1);
    let mut attempt = 1_u32;
    loop {
        match operation().await {
            Ok(value) => return Ok(value),
            Err(error) if attempt < max_attempts && should_retry(&error) => {
                let delay = retry_delay(base_delay, attempt);
                on_retry(attempt, max_attempts, delay, &error);
                tokio::time::sleep(delay).await;
                attempt += 1;
            }
            Err(source) => {
                return Err(RetryFailure {
                    attempts: attempt,
                    source,
                });
            }
        }
    }
}

fn catalog_entries(providers: HashMap<String, ModelsDevProvider>) -> Vec<ModelsDevCatalogEntry> {
    providers
        .into_values()
        .flat_map(|provider| {
            let provider_id = provider.id;
            provider
                .models
                .into_values()
                .filter_map(move |source_data| {
                    let model =
                        serde_json::from_value::<ModelsDevModel>(source_data.clone()).ok()?;
                    let raw_cost = model.cost;

                    Some(ModelsDevCatalogEntry {
                        provider_id: provider_id.clone(),
                        model_id: model.id,
                        model_name: model.name,
                        context_window: model.limit.and_then(|limit| limit.context),
                        cache_read_price_usd_per_million: cost_number(&raw_cost, "cache_read"),
                        cache_write_price_usd_per_million: cost_number(&raw_cost, "cache_write"),
                        input_price_usd_per_million: cost_number(&raw_cost, "input"),
                        output_price_usd_per_million: cost_number(&raw_cost, "output"),
                        raw_cost,
                        source_data,
                    })
                })
        })
        .collect()
}

fn cost_number(cost: &Option<Value>, key: &str) -> Option<f64> {
    cost.as_ref()?.get(key)?.as_f64()
}

#[cfg(test)]
#[path = "../../tests/unit/clients_models_dev.rs"]
mod tests;

use std::{fmt, time::Duration};

use serde::Deserialize;

use super::upstream_http::{UpstreamHttpError, endpoint_url, prepare_endpoint};

const MAX_RESPONSE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_DISCOVERED_MODELS: usize = 2000;

#[derive(Clone)]
pub struct UpstreamModelsClient {
    connect_timeout: Duration,
    request_timeout: Duration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpstreamModelsClientError {
    CredentialsRejected,
    InvalidBaseUrl,
    InvalidResponse,
    PrivateEndpoint,
    RequestFailed,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ModelsResponse {
    Data { data: Vec<ModelItem> },
    Models { models: Vec<ModelItem> },
    List(Vec<ModelItem>),
}

#[derive(Debug, Deserialize)]
struct ModelItem {
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    name: Option<String>,
}

impl UpstreamModelsClient {
    pub const fn new(connect_timeout: Duration, request_timeout: Duration) -> Self {
        Self {
            connect_timeout,
            request_timeout,
        }
    }

    pub async fn fetch_models(
        &self,
        base_url: &str,
        api_key: &str,
        provider_id: &str,
    ) -> Result<Vec<String>, UpstreamModelsClientError> {
        let models_url = models_url(base_url).inspect_err(|_| {
            tracing::warn!(
                provider_id,
                error_kind = "invalid_base_url",
                "upstream model discovery URL validation failed"
            );
        })?;
        let prepared = prepare_endpoint(
            models_url,
            provider_id,
            "model_discovery",
            self.connect_timeout,
            self.request_timeout,
        )
        .await
        .map_err(map_http_error)?;
        let host = prepared.host;
        let port = prepared.port;
        let endpoint_path = prepared.endpoint_path;
        let request = prepared.client.get(prepared.url);
        let (request, auth_scheme) = if provider_id.contains("anthropic") {
            (
                request
                    .header("x-api-key", api_key)
                    .header("anthropic-version", "2023-06-01"),
                "x-api-key",
            )
        } else if provider_id.contains("google") || provider_id.contains("gemini") {
            (request.header("x-goog-api-key", api_key), "x-goog-api-key")
        } else {
            (request.bearer_auth(api_key), "authorization-bearer")
        };
        let response = request.send().await.map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                auth_scheme,
                is_connect = error.is_connect(),
                is_timeout = error.is_timeout(),
                error = %error,
                error_kind = "request_failed",
                "upstream model discovery request failed"
            );
            UpstreamModelsClientError::RequestFailed
        })?;
        let status = response.status();
        let content_length = response.content_length();
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("unknown")
            .to_owned();
        if matches!(
            status,
            reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
        ) {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                auth_scheme,
                http_status = status.as_u16(),
                response_content_type = content_type,
                error_kind = "credentials_rejected",
                "upstream model discovery credentials were rejected"
            );
            return Err(UpstreamModelsClientError::CredentialsRejected);
        }
        if !status.is_success() {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                auth_scheme,
                http_status = status.as_u16(),
                response_content_type = content_type,
                error_kind = "upstream_http_error",
                "upstream model discovery returned an unsuccessful HTTP status"
            );
            return Err(UpstreamModelsClientError::RequestFailed);
        }
        if content_length.is_some_and(|length| length > MAX_RESPONSE_BYTES) {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                http_status = status.as_u16(),
                response_content_length = content_length,
                error_kind = "response_too_large",
                "upstream model discovery response exceeded the size limit"
            );
            return Err(UpstreamModelsClientError::InvalidResponse);
        }
        let body = response.bytes().await.map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                http_status = status.as_u16(),
                error = %error,
                error_kind = "response_read_failed",
                "upstream model discovery response body could not be read"
            );
            UpstreamModelsClientError::RequestFailed
        })?;
        if u64::try_from(body.len()).unwrap_or(u64::MAX) > MAX_RESPONSE_BYTES {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                http_status = status.as_u16(),
                response_bytes = body.len(),
                error_kind = "response_too_large",
                "upstream model discovery response exceeded the size limit"
            );
            return Err(UpstreamModelsClientError::InvalidResponse);
        }
        let response = serde_json::from_slice::<ModelsResponse>(&body).map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                http_status = status.as_u16(),
                response_bytes = body.len(),
                response_content_type = content_type,
                error = %error,
                error_kind = "invalid_response_json",
                "upstream model discovery response was not a supported models payload"
            );
            UpstreamModelsClientError::InvalidResponse
        })?;

        let models = normalize_models(response).inspect_err(|_| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                upstream_port = port,
                endpoint_path,
                http_status = status.as_u16(),
                error_kind = "invalid_model_list",
                "upstream model discovery response contained no usable model identifiers"
            );
        })?;
        tracing::info!(
            provider_id,
            upstream_host = host,
            upstream_port = port,
            endpoint_path,
            http_status = status.as_u16(),
            model_count = models.len(),
            "upstream model discovery completed"
        );
        Ok(models)
    }
}

impl fmt::Display for UpstreamModelsClientError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::CredentialsRejected => "upstream credentials were rejected",
            Self::InvalidBaseUrl => "upstream base URL is invalid",
            Self::InvalidResponse => "upstream model response is invalid",
            Self::PrivateEndpoint => "upstream endpoint resolves to a non-public address",
            Self::RequestFailed => "upstream model request failed",
        })
    }
}

impl std::error::Error for UpstreamModelsClientError {}

fn models_url(base_url: &str) -> Result<reqwest::Url, UpstreamModelsClientError> {
    endpoint_url(base_url, "models").map_err(map_http_error)
}

fn normalize_models(response: ModelsResponse) -> Result<Vec<String>, UpstreamModelsClientError> {
    let items = match response {
        ModelsResponse::Data { data } | ModelsResponse::Models { models: data } => data,
        ModelsResponse::List(data) => data,
    };
    let mut models = items
        .into_iter()
        .filter_map(|item| item.id.or(item.name))
        .map(|value| value.trim().to_owned())
        .filter(|value| {
            !value.is_empty()
                && value.chars().count() <= 200
                && !value.chars().any(char::is_control)
        })
        .collect::<Vec<_>>();
    models.sort_unstable();
    models.dedup();
    if models.is_empty() || models.len() > MAX_DISCOVERED_MODELS {
        return Err(UpstreamModelsClientError::InvalidResponse);
    }
    Ok(models)
}

fn map_http_error(error: UpstreamHttpError) -> UpstreamModelsClientError {
    match error {
        UpstreamHttpError::InvalidBaseUrl => UpstreamModelsClientError::InvalidBaseUrl,
        UpstreamHttpError::PrivateEndpoint => UpstreamModelsClientError::PrivateEndpoint,
        UpstreamHttpError::RequestFailed => UpstreamModelsClientError::RequestFailed,
    }
}

#[cfg(test)]
#[path = "../../tests/unit/clients_upstream_models.rs"]
mod tests;

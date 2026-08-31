use std::{fmt, time::Duration, time::Instant};

use serde::Deserialize;
use serde_json::{Value, json};

use super::upstream_http::{UpstreamHttpError, endpoint_url, prepare_endpoint};

const MAX_INFERENCE_RESPONSE_BYTES: u64 = 512 * 1024;
const MAX_OUTPUT_TOKENS: u64 = 256;

#[derive(Clone)]
pub struct UpstreamInferenceClient {
    connect_timeout: Duration,
    request_timeout: Duration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpstreamInferenceClientError {
    CredentialsRejected,
    InvalidBaseUrl,
    InvalidResponse,
    PrivateEndpoint,
    RequestFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InferenceRole {
    Assistant,
    User,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InferenceMessage {
    pub content: String,
    pub role: InferenceRole,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpstreamInferenceRequest {
    pub messages: Vec<InferenceMessage>,
    pub model: String,
    pub system_prompt: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpstreamInferenceResponse {
    pub content: String,
    pub finish_reason: Option<String>,
    pub input_tokens: Option<u64>,
    pub latency_ms: u64,
    pub model: Option<String>,
    pub output_tokens: Option<u64>,
    pub system_fingerprint: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum InferenceProtocol {
    Anthropic,
    Google,
    OpenAiCompatible,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    #[serde(default)]
    choices: Vec<OpenAiChoice>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    system_fingerprint: Option<String>,
    #[serde(default)]
    usage: Option<OpenAiUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    #[serde(default)]
    finish_reason: Option<String>,
    message: OpenAiMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiMessage {
    #[serde(default)]
    content: Value,
}

#[derive(Debug, Deserialize)]
struct OpenAiUsage {
    #[serde(default)]
    completion_tokens: Option<u64>,
    #[serde(default)]
    prompt_tokens: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    #[serde(default)]
    content: Vec<AnthropicContent>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    stop_reason: Option<String>,
    #[serde(default)]
    usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(default)]
    text: Option<String>,
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    #[serde(default)]
    input_tokens: Option<u64>,
    #[serde(default)]
    output_tokens: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleResponse {
    #[serde(default)]
    candidates: Vec<GoogleCandidate>,
    #[serde(default)]
    usage_metadata: Option<GoogleUsage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleCandidate {
    content: GoogleContent,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleContent {
    #[serde(default)]
    parts: Vec<GooglePart>,
}

#[derive(Debug, Deserialize)]
struct GooglePart {
    #[serde(default)]
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleUsage {
    #[serde(default)]
    candidates_token_count: Option<u64>,
    #[serde(default)]
    prompt_token_count: Option<u64>,
}

impl UpstreamInferenceClient {
    pub const fn new(connect_timeout: Duration, request_timeout: Duration) -> Self {
        Self {
            connect_timeout,
            request_timeout,
        }
    }

    pub async fn infer(
        &self,
        base_url: &str,
        api_key: &str,
        provider_id: &str,
        request: &UpstreamInferenceRequest,
    ) -> Result<UpstreamInferenceResponse, UpstreamInferenceClientError> {
        let protocol = inference_protocol(provider_id);
        let endpoint = inference_endpoint(base_url, protocol, &request.model)?;
        let prepared = prepare_endpoint(
            endpoint,
            provider_id,
            "model_verification",
            self.connect_timeout,
            self.request_timeout,
        )
        .await
        .map_err(map_http_error)?;
        let host = prepared.host;
        let endpoint_path = prepared.endpoint_path;
        let payload = inference_payload(protocol, provider_id, request);
        let http_request = prepared.client.post(prepared.url).json(&payload);
        let (http_request, auth_scheme) = match protocol {
            InferenceProtocol::Anthropic => (
                http_request
                    .header("x-api-key", api_key)
                    .header("anthropic-version", "2023-06-01"),
                "x-api-key",
            ),
            InferenceProtocol::Google => (
                http_request.header("x-goog-api-key", api_key),
                "x-goog-api-key",
            ),
            InferenceProtocol::OpenAiCompatible => {
                (http_request.bearer_auth(api_key), "authorization-bearer")
            }
        };
        let started_at = Instant::now();
        let response = http_request.send().await.map_err(|error| {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                endpoint_path,
                auth_scheme,
                is_connect = error.is_connect(),
                is_timeout = error.is_timeout(),
                error = %error,
                error_kind = "request_failed",
                "upstream model verification request failed"
            );
            UpstreamInferenceClientError::RequestFailed
        })?;
        let latency_ms = u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX);
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
            return Err(UpstreamInferenceClientError::CredentialsRejected);
        }
        if !status.is_success() {
            tracing::warn!(
                provider_id,
                upstream_host = host,
                endpoint_path,
                http_status = status.as_u16(),
                response_content_type = content_type,
                error_kind = "upstream_http_error",
                "upstream model verification returned an unsuccessful status"
            );
            return Err(UpstreamInferenceClientError::RequestFailed);
        }
        if content_length.is_some_and(|length| length > MAX_INFERENCE_RESPONSE_BYTES) {
            return Err(UpstreamInferenceClientError::InvalidResponse);
        }
        let body = response
            .bytes()
            .await
            .map_err(|_| UpstreamInferenceClientError::RequestFailed)?;
        if u64::try_from(body.len()).unwrap_or(u64::MAX) > MAX_INFERENCE_RESPONSE_BYTES {
            return Err(UpstreamInferenceClientError::InvalidResponse);
        }

        let mut result = parse_inference_response(protocol, &body)?;
        result.latency_ms = latency_ms;
        Ok(result)
    }
}

impl fmt::Display for UpstreamInferenceClientError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::CredentialsRejected => "upstream credentials were rejected",
            Self::InvalidBaseUrl => "upstream base URL is invalid",
            Self::InvalidResponse => "upstream inference response is invalid",
            Self::PrivateEndpoint => "upstream endpoint resolves to a non-public address",
            Self::RequestFailed => "upstream inference request failed",
        })
    }
}

impl std::error::Error for UpstreamInferenceClientError {}

const fn inference_protocol(provider_id: &str) -> InferenceProtocol {
    if contains_ascii_case_insensitive(provider_id, "anthropic") {
        InferenceProtocol::Anthropic
    } else if contains_ascii_case_insensitive(provider_id, "google")
        || contains_ascii_case_insensitive(provider_id, "gemini")
    {
        InferenceProtocol::Google
    } else {
        InferenceProtocol::OpenAiCompatible
    }
}

const fn contains_ascii_case_insensitive(value: &str, needle: &str) -> bool {
    let value = value.as_bytes();
    let needle = needle.as_bytes();
    if needle.is_empty() || needle.len() > value.len() {
        return false;
    }
    let mut start = 0;
    while start + needle.len() <= value.len() {
        let mut offset = 0;
        while offset < needle.len() && value[start + offset].eq_ignore_ascii_case(&needle[offset]) {
            offset += 1;
        }
        if offset == needle.len() {
            return true;
        }
        start += 1;
    }
    false
}

fn inference_endpoint(
    base_url: &str,
    protocol: InferenceProtocol,
    model: &str,
) -> Result<reqwest::Url, UpstreamInferenceClientError> {
    let endpoint = match protocol {
        InferenceProtocol::Anthropic => "messages".to_owned(),
        InferenceProtocol::OpenAiCompatible => "chat/completions".to_owned(),
        InferenceProtocol::Google => {
            let model = model.strip_prefix("models/").unwrap_or(model);
            if model.is_empty()
                || model.chars().count() > 200
                || model
                    .chars()
                    .any(|character| character.is_control() || matches!(character, '/' | '?' | '#'))
            {
                return Err(UpstreamInferenceClientError::InvalidBaseUrl);
            }
            format!("models/{model}:generateContent")
        }
    };
    endpoint_url(base_url, &endpoint).map_err(map_http_error)
}

fn inference_payload(
    protocol: InferenceProtocol,
    provider_id: &str,
    request: &UpstreamInferenceRequest,
) -> Value {
    match protocol {
        InferenceProtocol::OpenAiCompatible => {
            let mut messages = vec![json!({
                "role": "system",
                "content": request.system_prompt,
            })];
            messages.extend(request.messages.iter().map(|message| {
                json!({
                    "role": match message.role {
                        InferenceRole::Assistant => "assistant",
                        InferenceRole::User => "user",
                    },
                    "content": message.content,
                })
            }));
            let mut payload = json!({
                "model": request.model,
                "messages": messages,
            });
            let output_limit_field = if contains_ascii_case_insensitive(provider_id, "openai") {
                "max_completion_tokens"
            } else {
                "max_tokens"
            };
            if let Value::Object(object) = &mut payload {
                object.insert(output_limit_field.to_owned(), json!(MAX_OUTPUT_TOKENS));
            }
            payload
        }
        InferenceProtocol::Anthropic => json!({
            "model": request.model,
            "system": request.system_prompt,
            "messages": request.messages.iter().map(|message| json!({
                "role": match message.role {
                    InferenceRole::Assistant => "assistant",
                    InferenceRole::User => "user",
                },
                "content": message.content,
            })).collect::<Vec<_>>(),
            "temperature": 0,
            "max_tokens": MAX_OUTPUT_TOKENS,
        }),
        InferenceProtocol::Google => json!({
            "systemInstruction": {
                "parts": [{ "text": request.system_prompt }],
            },
            "contents": request.messages.iter().map(|message| json!({
                "role": match message.role {
                    InferenceRole::Assistant => "model",
                    InferenceRole::User => "user",
                },
                "parts": [{ "text": message.content }],
            })).collect::<Vec<_>>(),
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": MAX_OUTPUT_TOKENS,
                "responseMimeType": "application/json",
            },
        }),
    }
}

fn parse_inference_response(
    protocol: InferenceProtocol,
    body: &[u8],
) -> Result<UpstreamInferenceResponse, UpstreamInferenceClientError> {
    match protocol {
        InferenceProtocol::OpenAiCompatible => {
            let response: OpenAiResponse = serde_json::from_slice(body)
                .map_err(|_| UpstreamInferenceClientError::InvalidResponse)?;
            let choice = response
                .choices
                .into_iter()
                .next()
                .ok_or(UpstreamInferenceClientError::InvalidResponse)?;
            let content = openai_content_text(choice.message.content)
                .ok_or(UpstreamInferenceClientError::InvalidResponse)?;
            Ok(UpstreamInferenceResponse {
                content,
                finish_reason: choice.finish_reason,
                input_tokens: response
                    .usage
                    .as_ref()
                    .and_then(|usage| usage.prompt_tokens),
                latency_ms: 0,
                model: response.model,
                output_tokens: response
                    .usage
                    .as_ref()
                    .and_then(|usage| usage.completion_tokens),
                system_fingerprint: response.system_fingerprint,
            })
        }
        InferenceProtocol::Anthropic => {
            let response: AnthropicResponse = serde_json::from_slice(body)
                .map_err(|_| UpstreamInferenceClientError::InvalidResponse)?;
            let content = response
                .content
                .into_iter()
                .filter(|item| item.kind == "text")
                .filter_map(|item| item.text)
                .collect::<Vec<_>>()
                .join("");
            if content.is_empty() {
                return Err(UpstreamInferenceClientError::InvalidResponse);
            }
            Ok(UpstreamInferenceResponse {
                content,
                finish_reason: response.stop_reason,
                input_tokens: response.usage.as_ref().and_then(|usage| usage.input_tokens),
                latency_ms: 0,
                model: response.model,
                output_tokens: response
                    .usage
                    .as_ref()
                    .and_then(|usage| usage.output_tokens),
                system_fingerprint: None,
            })
        }
        InferenceProtocol::Google => {
            let response: GoogleResponse = serde_json::from_slice(body)
                .map_err(|_| UpstreamInferenceClientError::InvalidResponse)?;
            let candidate = response
                .candidates
                .into_iter()
                .next()
                .ok_or(UpstreamInferenceClientError::InvalidResponse)?;
            let content = candidate
                .content
                .parts
                .into_iter()
                .filter_map(|part| part.text)
                .collect::<Vec<_>>()
                .join("");
            if content.is_empty() {
                return Err(UpstreamInferenceClientError::InvalidResponse);
            }
            Ok(UpstreamInferenceResponse {
                content,
                finish_reason: candidate.finish_reason,
                input_tokens: response
                    .usage_metadata
                    .as_ref()
                    .and_then(|usage| usage.prompt_token_count),
                latency_ms: 0,
                model: None,
                output_tokens: response
                    .usage_metadata
                    .as_ref()
                    .and_then(|usage| usage.candidates_token_count),
                system_fingerprint: None,
            })
        }
    }
}

fn openai_content_text(content: Value) -> Option<String> {
    match content {
        Value::String(content) if !content.is_empty() => Some(content),
        Value::Array(parts) => {
            let content = parts
                .into_iter()
                .filter_map(|part| {
                    part.get("text")
                        .and_then(Value::as_str)
                        .or_else(|| part.get("content").and_then(Value::as_str))
                        .map(str::to_owned)
                })
                .collect::<Vec<_>>()
                .join("");
            (!content.is_empty()).then_some(content)
        }
        _ => None,
    }
}

fn map_http_error(error: UpstreamHttpError) -> UpstreamInferenceClientError {
    match error {
        UpstreamHttpError::InvalidBaseUrl => UpstreamInferenceClientError::InvalidBaseUrl,
        UpstreamHttpError::PrivateEndpoint => UpstreamInferenceClientError::PrivateEndpoint,
        UpstreamHttpError::RequestFailed => UpstreamInferenceClientError::RequestFailed,
    }
}

#[cfg(test)]
#[path = "../../tests/unit/clients_upstream_model_verification.rs"]
mod tests;

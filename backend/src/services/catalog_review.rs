use std::{collections::BTreeSet, time::Instant};

use serde_json::Value;
use uuid::Uuid;

use crate::{
    clients::{
        InferenceMessage, InferenceRole, UpstreamInferenceClient, UpstreamInferenceClientError,
        UpstreamInferenceRequest, UpstreamInferenceResponse, UpstreamModelsClient,
        UpstreamModelsClientError,
    },
    domain::{
        AccountRole, CatalogReview, CatalogReviewConnectionTest, CatalogReviewDecision,
        CatalogReviewKind, CatalogReviewModelCheck, CatalogReviewModelCheckKind,
        CatalogReviewModelCheckStatus, CatalogReviewModelIdentityRisk, CatalogReviewModelTest,
        CatalogReviewStatus, Page, Pagination, UserId,
    },
    repository::{
        CatalogReviewRepository, CatalogReviewResult, CatalogReviewSearch, RepositoryError,
    },
    security::CredentialCipher,
};

use super::authorization::require_admin;

const MAX_SEARCH_LENGTH: usize = 256;
const MAX_REVIEW_NOTE_LENGTH: usize = 1_000;
const MODEL_TEST_ATTEMPTS: u8 = 3;
const MODEL_TEST_MAX_OUTPUT_TOKENS: u64 = 256;

#[derive(Clone)]
pub struct CatalogReviewService {
    credential_cipher: CredentialCipher,
    repository: CatalogReviewRepository,
    upstream_inference_client: UpstreamInferenceClient,
    upstream_models_client: UpstreamModelsClient,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewServiceError {
    ConnectionFailed,
    CredentialsRejected,
    Forbidden,
    InvalidInput,
    NotFound,
    InvalidState,
    ModelTestFailed,
    Internal,
}

impl CatalogReviewService {
    pub fn new(
        repository: CatalogReviewRepository,
        credential_cipher: CredentialCipher,
        upstream_inference_client: UpstreamInferenceClient,
        upstream_models_client: UpstreamModelsClient,
    ) -> Self {
        Self {
            credential_cipher,
            repository,
            upstream_inference_client,
            upstream_models_client,
        }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        kind: CatalogReviewKind,
        pagination: Pagination,
        query: Option<String>,
        status: Option<CatalogReviewStatus>,
    ) -> Result<Page<CatalogReview>, CatalogReviewServiceError> {
        require_admin(requester_role, CatalogReviewServiceError::Forbidden)?;
        let search = catalog_review_search(query, status)?;

        self.repository
            .list(kind, &search, pagination)
            .await
            .map_err(|error| {
                tracing::error!(%error, review_kind = kind.as_str(), "catalog review list failed");
                CatalogReviewServiceError::Internal
            })
    }

    pub async fn review(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        kind: CatalogReviewKind,
        review_id: String,
        expected_status: CatalogReviewStatus,
        decision: CatalogReviewDecision,
        review_note: String,
    ) -> Result<(), CatalogReviewServiceError> {
        require_admin(requester_role, CatalogReviewServiceError::Forbidden)?;
        if requester_id <= 0 {
            return Err(CatalogReviewServiceError::InvalidInput);
        }
        let review_id =
            Uuid::parse_str(&review_id).map_err(|_| CatalogReviewServiceError::InvalidInput)?;
        let review_note = validate_review_note(decision, review_note)?;

        match self
            .repository
            .review(kind, review_id, expected_status, decision, review_note)
            .await
            .map_err(|error| map_mutation_error(error, kind, review_id))?
        {
            CatalogReviewResult::Reviewed => {
                tracing::info!(
                    reviewer_user_id = requester_id,
                    review_kind = kind.as_str(),
                    previous_status = expected_status.as_str(),
                    %review_id,
                    ?decision,
                    "catalog review decision saved"
                );
                Ok(())
            }
            CatalogReviewResult::NotFound => Err(CatalogReviewServiceError::NotFound),
            CatalogReviewResult::InvalidState => Err(CatalogReviewServiceError::InvalidState),
        }
    }

    pub async fn test_channel_connection(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        review_id: String,
    ) -> Result<CatalogReviewConnectionTest, CatalogReviewServiceError> {
        require_admin(requester_role, CatalogReviewServiceError::Forbidden)?;
        if requester_id <= 0 {
            return Err(CatalogReviewServiceError::InvalidInput);
        }
        let review_id =
            Uuid::parse_str(&review_id).map_err(|_| CatalogReviewServiceError::InvalidInput)?;
        let connection = self
            .repository
            .find_channel_connection(review_id)
            .await
            .map_err(|error| {
                tracing::error!(%error, %review_id, "catalog review channel lookup failed");
                CatalogReviewServiceError::Internal
            })?
            .ok_or(CatalogReviewServiceError::NotFound)?;
        if connection.base_url.is_empty() || connection.api_key_ciphertext.is_empty() {
            return Err(CatalogReviewServiceError::ConnectionFailed);
        }
        let internal_channel_id = connection.id.hyphenated().to_string();
        let api_key = self
            .credential_cipher
            .decrypt(&connection.api_key_ciphertext, &internal_channel_id)
            .map_err(|error| {
                tracing::error!(
                    ?error,
                    %review_id,
                    "catalog review channel credential decryption failed"
                );
                CatalogReviewServiceError::Internal
            })?;
        let started_at = Instant::now();
        let models = self
            .upstream_models_client
            .fetch_models(&connection.base_url, &api_key, &connection.provider_id)
            .await
            .map_err(|error| {
                tracing::warn!(
                    %error,
                    %review_id,
                    reviewer_user_id = requester_id,
                    "catalog review channel connection test failed"
                );
                match error {
                    UpstreamModelsClientError::CredentialsRejected => {
                        CatalogReviewServiceError::CredentialsRejected
                    }
                    UpstreamModelsClientError::InvalidBaseUrl
                    | UpstreamModelsClientError::InvalidResponse
                    | UpstreamModelsClientError::PrivateEndpoint
                    | UpstreamModelsClientError::RequestFailed => {
                        CatalogReviewServiceError::ConnectionFailed
                    }
                }
            })?;
        let result = CatalogReviewConnectionTest {
            latency_ms: u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX),
            model_count: u64::try_from(models.len())
                .map_err(|_| CatalogReviewServiceError::Internal)?,
        };
        tracing::info!(
            %review_id,
            reviewer_user_id = requester_id,
            latency_ms = result.latency_ms,
            model_count = result.model_count,
            "catalog review channel connection test succeeded"
        );

        Ok(result)
    }

    pub async fn test_model(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        review_id: String,
    ) -> Result<CatalogReviewModelTest, CatalogReviewServiceError> {
        require_admin(requester_role, CatalogReviewServiceError::Forbidden)?;
        if requester_id <= 0 {
            return Err(CatalogReviewServiceError::InvalidInput);
        }
        let review_id =
            Uuid::parse_str(&review_id).map_err(|_| CatalogReviewServiceError::InvalidInput)?;
        let connection = self
            .repository
            .find_model_connection(review_id)
            .await
            .map_err(|error| {
                tracing::error!(%error, %review_id, "catalog review model lookup failed");
                CatalogReviewServiceError::Internal
            })?
            .ok_or(CatalogReviewServiceError::NotFound)?;
        if connection.base_url.is_empty()
            || connection.api_key_ciphertext.is_empty()
            || connection.model_identifier.is_empty()
        {
            return Err(CatalogReviewServiceError::ModelTestFailed);
        }
        let internal_channel_id = connection.channel_id.hyphenated().to_string();
        let api_key = self
            .credential_cipher
            .decrypt(&connection.api_key_ciphertext, &internal_channel_id)
            .map_err(|error| {
                tracing::error!(?error, %review_id, "catalog review model credential decryption failed");
                CatalogReviewServiceError::Internal
            })?;
        let challenges = [
            ModelVerificationChallenge::new(),
            ModelVerificationChallenge::new(),
            ModelVerificationChallenge::new(),
        ];
        let first = run_model_challenge(
            &self.upstream_inference_client,
            &connection.base_url,
            &api_key,
            &connection.provider_id,
            &connection.model_identifier,
            &challenges[0],
        );
        let second = run_model_challenge(
            &self.upstream_inference_client,
            &connection.base_url,
            &api_key,
            &connection.provider_id,
            &connection.model_identifier,
            &challenges[1],
        );
        let third = run_model_challenge(
            &self.upstream_inference_client,
            &connection.base_url,
            &api_key,
            &connection.provider_id,
            &connection.model_identifier,
            &challenges[2],
        );
        let (first, second, third) = tokio::join!(first, second, third);
        let attempts = vec![first, second, third];
        if attempts.iter().any(|attempt| {
            matches!(
                attempt,
                Err(UpstreamInferenceClientError::CredentialsRejected)
            )
        }) {
            return Err(CatalogReviewServiceError::CredentialsRejected);
        }
        let successful_attempts = attempts.iter().filter(|attempt| attempt.is_ok()).count();
        if successful_attempts == 0 {
            log_model_test_failure(review_id, requester_id, &attempts);
            return Err(CatalogReviewServiceError::ModelTestFailed);
        }

        let Some(multi_turn_attempt) = attempts.iter().find_map(|attempt| attempt.as_ref().ok())
        else {
            return Err(CatalogReviewServiceError::ModelTestFailed);
        };
        let multi_turn = run_multi_turn_challenge(
            &self.upstream_inference_client,
            &connection.base_url,
            &api_key,
            &connection.provider_id,
            &connection.model_identifier,
            multi_turn_attempt,
        )
        .await;
        if matches!(
            multi_turn,
            Err(UpstreamInferenceClientError::CredentialsRejected)
        ) {
            return Err(CatalogReviewServiceError::CredentialsRejected);
        }

        let result = build_model_test_result(
            &connection.base_url,
            &connection.provider_id,
            &connection.model_identifier,
            &attempts,
            multi_turn,
        );
        tracing::info!(
            %review_id,
            reviewer_user_id = requester_id,
            attempts = result.attempts,
            successful_attempts = result.successful_attempts,
            average_latency_ms = result.average_latency_ms,
            identity_risk = result.identity_risk.as_str(),
            official_endpoint = result.official_endpoint,
            "catalog review model verification completed"
        );

        Ok(result)
    }
}

#[derive(Clone, Debug)]
struct ModelVerificationChallenge {
    expected_result: i64,
    memory_marker: String,
    system_marker: String,
    system_prompt: String,
    user_marker: String,
    user_prompt: String,
}

#[derive(Debug)]
struct EvaluatedModelAttempt {
    challenge: ModelVerificationChallenge,
    content_integrity: bool,
    input_fidelity: bool,
    output_structure: bool,
    response: UpstreamInferenceResponse,
}

impl ModelVerificationChallenge {
    fn new() -> Self {
        let random = Uuid::new_v4();
        let bytes = random.as_bytes();
        let left = i64::from(bytes[0]) + 17;
        let right = i64::from(bytes[1]) + 29;
        let identifier = random.simple().to_string();
        let system_marker = format!("system-{identifier}");
        let user_marker = format!("user-{identifier}");
        let memory_marker = format!("memory-{identifier}");
        let system_prompt = format!(
            "This is an automated integrity check. The system marker is {system_marker}. Follow the JSON schema requested by the latest user message. Return only one compact JSON object without Markdown or commentary. Preserve marker values exactly."
        );
        let user_prompt = format!(
            "The user marker is {user_marker}. Remember the private memory marker {memory_marker}, but do not include that memory marker in this first response. Calculate {left} + {right}. Return exactly these three JSON fields: systemMarker, userMarker, result."
        );

        Self {
            expected_result: left + right,
            memory_marker,
            system_marker,
            system_prompt,
            user_marker,
            user_prompt,
        }
    }
}

async fn run_model_challenge(
    client: &UpstreamInferenceClient,
    base_url: &str,
    api_key: &str,
    provider_id: &str,
    model: &str,
    challenge: &ModelVerificationChallenge,
) -> Result<EvaluatedModelAttempt, UpstreamInferenceClientError> {
    let request = UpstreamInferenceRequest {
        messages: vec![InferenceMessage {
            content: challenge.user_prompt.clone(),
            role: InferenceRole::User,
        }],
        model: model.to_owned(),
        system_prompt: challenge.system_prompt.clone(),
    };
    let response = client
        .infer(base_url, api_key, provider_id, &request)
        .await?;
    let evaluation = evaluate_challenge_output(challenge, &response.content);

    Ok(EvaluatedModelAttempt {
        challenge: challenge.clone(),
        content_integrity: evaluation.content_integrity,
        input_fidelity: evaluation.input_fidelity,
        output_structure: evaluation.output_structure,
        response,
    })
}

async fn run_multi_turn_challenge(
    client: &UpstreamInferenceClient,
    base_url: &str,
    api_key: &str,
    provider_id: &str,
    model: &str,
    attempt: &EvaluatedModelAttempt,
) -> Result<UpstreamInferenceResponse, UpstreamInferenceClientError> {
    let request = UpstreamInferenceRequest {
        messages: vec![
            InferenceMessage {
                content: attempt.challenge.user_prompt.clone(),
                role: InferenceRole::User,
            },
            InferenceMessage {
                content: attempt.response.content.clone(),
                role: InferenceRole::Assistant,
            },
            InferenceMessage {
                content: "Return exactly one JSON field named memoryMarker containing the private memory marker from my first message."
                    .to_owned(),
                role: InferenceRole::User,
            },
        ],
        model: model.to_owned(),
        system_prompt: attempt.challenge.system_prompt.clone(),
    };

    client.infer(base_url, api_key, provider_id, &request).await
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
struct ChallengeEvaluation {
    content_integrity: bool,
    input_fidelity: bool,
    output_structure: bool,
}

fn evaluate_challenge_output(
    challenge: &ModelVerificationChallenge,
    content: &str,
) -> ChallengeEvaluation {
    let Ok(Value::Object(object)) = serde_json::from_str::<Value>(content.trim()) else {
        return ChallengeEvaluation::default();
    };
    let expected_keys = ["result", "systemMarker", "userMarker"];
    let output_structure = object.len() == expected_keys.len()
        && expected_keys.iter().all(|key| object.contains_key(*key));
    let system_matches = object
        .get("systemMarker")
        .and_then(Value::as_str)
        .is_some_and(|value| value == challenge.system_marker);
    let user_matches = object
        .get("userMarker")
        .and_then(Value::as_str)
        .is_some_and(|value| value == challenge.user_marker);
    let result_matches = object
        .get("result")
        .and_then(Value::as_i64)
        .is_some_and(|value| value == challenge.expected_result);

    ChallengeEvaluation {
        content_integrity: system_matches
            && user_matches
            && !content.contains(&challenge.memory_marker),
        input_fidelity: user_matches && result_matches,
        output_structure,
    }
}

fn build_model_test_result(
    base_url: &str,
    provider_id: &str,
    claimed_model: &str,
    attempts: &[Result<EvaluatedModelAttempt, UpstreamInferenceClientError>],
    multi_turn: Result<UpstreamInferenceResponse, UpstreamInferenceClientError>,
) -> CatalogReviewModelTest {
    let successful_attempts = attempts.iter().filter(|attempt| attempt.is_ok()).count();
    let input_fidelity = aggregate_boolean_checks(
        attempts
            .iter()
            .map(|attempt| attempt.as_ref().is_ok_and(|attempt| attempt.input_fidelity)),
    );
    let output_structure = aggregate_boolean_checks(attempts.iter().map(|attempt| {
        attempt
            .as_ref()
            .is_ok_and(|attempt| attempt.output_structure)
    }));
    let content_integrity = aggregate_boolean_checks(attempts.iter().map(|attempt| {
        attempt
            .as_ref()
            .is_ok_and(|attempt| attempt.content_integrity)
    }));
    let stable_attempts = attempts
        .iter()
        .filter(|attempt| {
            attempt.as_ref().is_ok_and(|attempt| {
                attempt.input_fidelity && attempt.output_structure && attempt.content_integrity
            })
        })
        .count();
    let stability = count_status(stable_attempts, usize::from(MODEL_TEST_ATTEMPTS));
    let multi_turn_status = multi_turn_status(attempts, &multi_turn);
    let responses = attempts
        .iter()
        .filter_map(|attempt| attempt.as_ref().ok().map(|attempt| &attempt.response))
        .chain(multi_turn.as_ref().ok());
    let responses = responses.collect::<Vec<_>>();
    let inference = count_status(successful_attempts, usize::from(MODEL_TEST_ATTEMPTS));
    let parameter_compliance = parameter_compliance_status(&responses);
    let token_accounting = token_accounting_status(&responses);
    let mut observed_models = responses
        .iter()
        .filter_map(|response| response.model.as_deref())
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    observed_models.sort_unstable();
    observed_models.dedup();
    let reported_model_count = responses
        .iter()
        .filter(|response| {
            response
                .model
                .as_deref()
                .is_some_and(|model| !model.trim().is_empty())
        })
        .count();
    let routing_consistency = routing_consistency_status(
        claimed_model,
        &observed_models,
        reported_model_count,
        responses.len(),
    );
    let official_endpoint = is_official_endpoint(base_url, provider_id);
    let identity_risk = identity_risk(
        claimed_model,
        &observed_models,
        official_endpoint,
        routing_consistency,
    );
    let mut system_fingerprints = responses
        .iter()
        .filter_map(|response| response.system_fingerprint.as_deref())
        .map(str::trim)
        .filter(|fingerprint| !fingerprint.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    system_fingerprints.sort_unstable();
    system_fingerprints.dedup();
    let average_latency_ms = average_latency(&responses);

    CatalogReviewModelTest {
        attempts: MODEL_TEST_ATTEMPTS,
        average_latency_ms,
        checks: vec![
            model_check(CatalogReviewModelCheckKind::Inference, inference),
            model_check(CatalogReviewModelCheckKind::InputFidelity, input_fidelity),
            model_check(
                CatalogReviewModelCheckKind::OutputStructure,
                output_structure,
            ),
            model_check(
                CatalogReviewModelCheckKind::MultiTurnContext,
                multi_turn_status,
            ),
            model_check(
                CatalogReviewModelCheckKind::ParameterCompliance,
                parameter_compliance,
            ),
            model_check(
                CatalogReviewModelCheckKind::TokenAccounting,
                token_accounting,
            ),
            model_check(
                CatalogReviewModelCheckKind::ContentIntegrity,
                content_integrity,
            ),
            model_check(CatalogReviewModelCheckKind::Stability, stability),
            model_check(
                CatalogReviewModelCheckKind::RoutingConsistency,
                routing_consistency,
            ),
        ],
        claimed_model: claimed_model.to_owned(),
        identity_risk,
        observed_models,
        official_endpoint,
        successful_attempts: u8::try_from(successful_attempts).unwrap_or(u8::MAX),
        system_fingerprints,
    }
}

fn aggregate_boolean_checks(checks: impl Iterator<Item = bool>) -> CatalogReviewModelCheckStatus {
    let checks = checks.collect::<Vec<_>>();
    count_status(
        checks.iter().filter(|passed| **passed).count(),
        checks.len(),
    )
}

const fn count_status(passed: usize, total: usize) -> CatalogReviewModelCheckStatus {
    if total > 0 && passed == total {
        CatalogReviewModelCheckStatus::Passed
    } else if passed > 0 {
        CatalogReviewModelCheckStatus::Warning
    } else {
        CatalogReviewModelCheckStatus::Failed
    }
}

fn multi_turn_status(
    attempts: &[Result<EvaluatedModelAttempt, UpstreamInferenceClientError>],
    response: &Result<UpstreamInferenceResponse, UpstreamInferenceClientError>,
) -> CatalogReviewModelCheckStatus {
    let Some(attempt) = attempts.iter().find_map(|attempt| attempt.as_ref().ok()) else {
        return CatalogReviewModelCheckStatus::Failed;
    };
    let Ok(response) = response else {
        return CatalogReviewModelCheckStatus::Failed;
    };
    let Ok(Value::Object(object)) = serde_json::from_str::<Value>(response.content.trim()) else {
        return CatalogReviewModelCheckStatus::Failed;
    };
    if object.len() == 1
        && object
            .get("memoryMarker")
            .and_then(Value::as_str)
            .is_some_and(|value| value == attempt.challenge.memory_marker)
    {
        CatalogReviewModelCheckStatus::Passed
    } else {
        CatalogReviewModelCheckStatus::Failed
    }
}

fn parameter_compliance_status(
    responses: &[&UpstreamInferenceResponse],
) -> CatalogReviewModelCheckStatus {
    if responses.iter().any(|response| {
        response
            .output_tokens
            .is_some_and(|tokens| tokens > MODEL_TEST_MAX_OUTPUT_TOKENS)
            || response.finish_reason.as_deref().is_some_and(|reason| {
                matches!(
                    reason.to_ascii_lowercase().as_str(),
                    "length" | "max_tokens"
                )
            })
    }) {
        return CatalogReviewModelCheckStatus::Failed;
    }
    if responses
        .iter()
        .all(|response| response.finish_reason.is_some() && response.output_tokens.is_some())
    {
        CatalogReviewModelCheckStatus::Passed
    } else {
        CatalogReviewModelCheckStatus::Warning
    }
}

fn token_accounting_status(
    responses: &[&UpstreamInferenceResponse],
) -> CatalogReviewModelCheckStatus {
    if responses
        .iter()
        .any(|response| response.input_tokens == Some(0) || response.output_tokens == Some(0))
    {
        return CatalogReviewModelCheckStatus::Failed;
    }
    if responses.iter().all(|response| {
        response.input_tokens.is_some_and(|tokens| tokens > 0)
            && response.output_tokens.is_some_and(|tokens| tokens > 0)
    }) {
        CatalogReviewModelCheckStatus::Passed
    } else {
        CatalogReviewModelCheckStatus::Warning
    }
}

fn routing_consistency_status(
    claimed_model: &str,
    observed_models: &[String],
    reported_model_count: usize,
    response_count: usize,
) -> CatalogReviewModelCheckStatus {
    if observed_models.is_empty() {
        CatalogReviewModelCheckStatus::Warning
    } else if observed_models.len() != 1 || observed_models[0] != claimed_model {
        CatalogReviewModelCheckStatus::Failed
    } else if reported_model_count == response_count {
        CatalogReviewModelCheckStatus::Passed
    } else {
        CatalogReviewModelCheckStatus::Warning
    }
}

fn identity_risk(
    claimed_model: &str,
    observed_models: &[String],
    official_endpoint: bool,
    routing_consistency: CatalogReviewModelCheckStatus,
) -> CatalogReviewModelIdentityRisk {
    if matches!(routing_consistency, CatalogReviewModelCheckStatus::Failed) {
        CatalogReviewModelIdentityRisk::High
    } else if observed_models.is_empty() {
        CatalogReviewModelIdentityRisk::Unverified
    } else if matches!(routing_consistency, CatalogReviewModelCheckStatus::Passed)
        && observed_models.len() == 1
        && observed_models[0].as_str() == claimed_model
        && official_endpoint
    {
        CatalogReviewModelIdentityRisk::Low
    } else {
        CatalogReviewModelIdentityRisk::Medium
    }
}

fn is_official_endpoint(base_url: &str, provider_id: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(base_url) else {
        return false;
    };
    let Some(host) = url.host_str() else {
        return false;
    };
    let provider_id = provider_id.to_ascii_lowercase();
    match provider_id.as_str() {
        value if value.contains("openai") => host.eq_ignore_ascii_case("api.openai.com"),
        value if value.contains("anthropic") => host.eq_ignore_ascii_case("api.anthropic.com"),
        value if value.contains("google") || value.contains("gemini") => {
            host.eq_ignore_ascii_case("generativelanguage.googleapis.com")
                || host.eq_ignore_ascii_case("aiplatform.googleapis.com")
        }
        _ => false,
    }
}

fn average_latency(responses: &[&UpstreamInferenceResponse]) -> u64 {
    if responses.is_empty() {
        return 0;
    }
    let total = responses.iter().fold(0_u128, |total, response| {
        total + u128::from(response.latency_ms)
    });
    u64::try_from(total / responses.len() as u128).unwrap_or(u64::MAX)
}

const fn model_check(
    kind: CatalogReviewModelCheckKind,
    status: CatalogReviewModelCheckStatus,
) -> CatalogReviewModelCheck {
    CatalogReviewModelCheck { kind, status }
}

fn log_model_test_failure(
    review_id: Uuid,
    requester_id: UserId,
    attempts: &[Result<EvaluatedModelAttempt, UpstreamInferenceClientError>],
) {
    let error_kinds = attempts
        .iter()
        .filter_map(|attempt| attempt.as_ref().err())
        .map(|error| format!("{error:?}"))
        .collect::<BTreeSet<_>>();
    tracing::warn!(
        %review_id,
        reviewer_user_id = requester_id,
        ?error_kinds,
        "catalog review model verification produced no successful responses"
    );
}

fn validate_review_note(
    decision: CatalogReviewDecision,
    review_note: String,
) -> Result<String, CatalogReviewServiceError> {
    let review_note = review_note.trim();
    if review_note.chars().count() > MAX_REVIEW_NOTE_LENGTH || review_note.contains('\0') {
        return Err(CatalogReviewServiceError::InvalidInput);
    }
    if decision == CatalogReviewDecision::Reject && review_note.is_empty() {
        return Err(CatalogReviewServiceError::InvalidInput);
    }

    Ok(review_note.to_owned())
}

fn catalog_review_search(
    query: Option<String>,
    status: Option<CatalogReviewStatus>,
) -> Result<CatalogReviewSearch, CatalogReviewServiceError> {
    let Some(query) = query else {
        return Ok(CatalogReviewSearch {
            exact_channel_id: None,
            exact_id: None,
            pattern: None,
            status,
        });
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(CatalogReviewSearch {
            exact_channel_id: None,
            exact_id: None,
            pattern: None,
            status,
        });
    }
    if query.chars().count() > MAX_SEARCH_LENGTH || query.contains('\0') {
        return Err(CatalogReviewServiceError::InvalidInput);
    }

    Ok(CatalogReviewSearch {
        exact_channel_id: query.parse::<i64>().ok().filter(|value| *value > 0),
        exact_id: Uuid::parse_str(query).ok(),
        pattern: Some(format!("%{}%", escape_like(query))),
        status,
    })
}

fn escape_like(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn map_mutation_error(
    error: RepositoryError,
    kind: CatalogReviewKind,
    review_id: Uuid,
) -> CatalogReviewServiceError {
    tracing::error!(%error, review_kind = kind.as_str(), %review_id, "catalog review mutation failed");
    CatalogReviewServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_catalog_review.rs"]
mod tests;

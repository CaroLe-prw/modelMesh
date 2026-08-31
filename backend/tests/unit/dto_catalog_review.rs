use crate::domain::{
    CatalogReview, CatalogReviewAction, CatalogReviewDecision, CatalogReviewKind,
    CatalogReviewModelCheck, CatalogReviewModelCheckKind, CatalogReviewModelCheckStatus,
    CatalogReviewModelIdentityRisk, CatalogReviewModelTest, CatalogReviewStatus,
};

use super::{
    CatalogReviewConnectionTestResponse, CatalogReviewDecisionValue, CatalogReviewKindValue,
    CatalogReviewModelTestResponse, CatalogReviewResponse, CatalogReviewStatusValue,
    ReviewCatalogItemRequest,
};

#[test]
fn connection_test_response_uses_public_camel_case_fields() {
    let response =
        CatalogReviewConnectionTestResponse::from(crate::domain::CatalogReviewConnectionTest {
            latency_ms: 245,
            model_count: 13,
        });

    assert_eq!(
        serde_json::to_value(response).expect("response should serialize"),
        serde_json::json!({"latencyMs": 245, "modelCount": 13})
    );
}

#[test]
fn model_test_response_uses_stable_check_and_risk_values() {
    let response = CatalogReviewModelTestResponse::from(CatalogReviewModelTest {
        attempts: 3,
        average_latency_ms: 245,
        checks: vec![CatalogReviewModelCheck {
            kind: CatalogReviewModelCheckKind::InputFidelity,
            status: CatalogReviewModelCheckStatus::Passed,
        }],
        claimed_model: "gpt-test".to_owned(),
        identity_risk: CatalogReviewModelIdentityRisk::Medium,
        observed_models: vec!["gpt-test".to_owned()],
        official_endpoint: false,
        successful_attempts: 3,
        system_fingerprints: vec!["fp_123".to_owned()],
    });

    assert_eq!(
        serde_json::to_value(response).expect("response should serialize"),
        serde_json::json!({
            "attempts": 3,
            "averageLatencyMs": 245,
            "checks": [{"key": "inputFidelity", "status": "passed"}],
            "claimedModel": "gpt-test",
            "identityRisk": "medium",
            "observedModels": ["gpt-test"],
            "officialEndpoint": false,
            "successfulAttempts": 3,
            "systemFingerprints": ["fp_123"]
        })
    );
}

#[test]
fn review_request_uses_public_camel_case_values() {
    let request = serde_json::from_value::<ReviewCatalogItemRequest>(serde_json::json!({
        "kind": "model",
        "decision": "approved",
        "expectedStatus": "rejected",
        "reviewNote": "verified"
    }))
    .expect("review request should deserialize");

    assert_eq!(request.kind, CatalogReviewKindValue::Model);
    assert_eq!(request.decision, CatalogReviewDecisionValue::Approved);
    assert_eq!(request.expected_status, CatalogReviewStatusValue::Rejected);
    assert_eq!(request.review_note, "verified");
    assert_eq!(
        CatalogReviewKind::from(request.kind),
        CatalogReviewKind::Model
    );
    assert_eq!(
        CatalogReviewDecision::from(request.decision),
        CatalogReviewDecision::Approve
    );
    assert_eq!(
        CatalogReviewStatus::from(CatalogReviewStatusValue::Pending),
        CatalogReviewStatus::Pending
    );
}

#[test]
fn review_response_exposes_usd_price_without_database_scale() {
    let response = CatalogReviewResponse::from(CatalogReview {
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        channel_id: 42,
        action: CatalogReviewAction::PriceChange,
        kind: CatalogReviewKind::Model,
        name: "GPT-5.6 Sol".to_owned(),
        merchant: "Northstar AI".to_owned(),
        provider_id: "openai".to_owned(),
        provider: "OpenAI".to_owned(),
        model_identifier: Some("gpt-5.6-sol".to_owned()),
        context_window: Some(272_000),
        current_output_price_nano_per_million: Some(3_000_000_000),
        proposed_output_price_nano_per_million: Some(4_000_000_000),
        price_effective_at: None,
        review_note: "Pricing verified".to_owned(),
        status: CatalogReviewStatus::Pending,
        submitted_at: "2026-08-29T00:00:00Z"
            .parse()
            .expect("timestamp should parse"),
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["kind"], "model");
    assert_eq!(value["channelId"], 42);
    assert_eq!(value["action"], "priceChange");
    assert_eq!(value["status"], "pending");
    assert_eq!(value["outputPrice"], 40.0);
    assert_eq!(value["currentOutputPrice"], 30.0);
    assert_eq!(value["proposedOutputPrice"], 40.0);
    assert_eq!(value["contextWindow"], 272_000);
    assert_eq!(value["reviewNote"], "Pricing verified");
}

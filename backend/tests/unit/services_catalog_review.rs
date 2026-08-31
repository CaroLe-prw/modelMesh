use crate::{
    domain::{AccountRole, CatalogReviewDecision, CatalogReviewKind, Pagination},
    state::AppState,
};

use super::{
    CatalogReviewModelCheckStatus, CatalogReviewServiceError, ModelVerificationChallenge,
    catalog_review_search, evaluate_challenge_output, identity_risk, routing_consistency_status,
};
use crate::domain::CatalogReviewModelIdentityRisk;

fn service() -> super::CatalogReviewService {
    AppState::for_test().catalog_review_service
}

#[tokio::test]
async fn catalog_review_list_requires_an_administrator() {
    let result = service()
        .list(
            AccountRole::Merchant,
            CatalogReviewKind::Channel,
            Pagination::new(1, 20).expect("pagination should be valid"),
            None,
            None,
        )
        .await;

    assert!(matches!(result, Err(CatalogReviewServiceError::Forbidden)));
}

#[tokio::test]
async fn catalog_review_connection_test_requires_an_administrator() {
    let result = service()
        .test_channel_connection(
            42,
            AccountRole::Merchant,
            "00000000-0000-4000-8000-000000000001".to_owned(),
        )
        .await;

    assert!(matches!(result, Err(CatalogReviewServiceError::Forbidden)));
}

#[tokio::test]
async fn catalog_review_connection_test_rejects_an_invalid_identifier() {
    let result = service()
        .test_channel_connection(42, AccountRole::Admin, "not-a-uuid".to_owned())
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn catalog_review_model_test_requires_an_administrator() {
    let result = service()
        .test_model(
            42,
            AccountRole::Merchant,
            "00000000-0000-4000-8000-000000000001".to_owned(),
        )
        .await;

    assert!(matches!(result, Err(CatalogReviewServiceError::Forbidden)));
}

#[tokio::test]
async fn catalog_review_model_test_rejects_an_invalid_identifier() {
    let result = service()
        .test_model(42, AccountRole::Admin, "not-a-uuid".to_owned())
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn catalog_review_list_rejects_an_oversized_search_before_querying() {
    let result = service()
        .list(
            AccountRole::Admin,
            CatalogReviewKind::Model,
            Pagination::new(1, 20).expect("pagination should be valid"),
            Some("x".repeat(257)),
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[test]
fn catalog_review_search_recognizes_public_channel_id() {
    let search = catalog_review_search(Some("42".to_owned()), None).expect("valid search");

    assert_eq!(search.exact_channel_id, Some(42));
    assert_eq!(search.exact_id, None);
}

#[tokio::test]
async fn catalog_review_rejects_an_invalid_identifier_before_querying() {
    let result = service()
        .review(
            42,
            AccountRole::Admin,
            CatalogReviewKind::Channel,
            "not-a-uuid".to_owned(),
            crate::domain::CatalogReviewStatus::Pending,
            CatalogReviewDecision::Approve,
            String::new(),
        )
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn catalog_review_mutation_requires_an_administrator() {
    let result = service()
        .review(
            42,
            AccountRole::Merchant,
            CatalogReviewKind::Model,
            "00000000-0000-4000-8000-000000000001".to_owned(),
            crate::domain::CatalogReviewStatus::Pending,
            CatalogReviewDecision::Reject,
            "missing provider credentials".to_owned(),
        )
        .await;

    assert!(matches!(result, Err(CatalogReviewServiceError::Forbidden)));
}

#[tokio::test]
async fn catalog_review_rejection_requires_a_note_before_querying() {
    let result = service()
        .review(
            42,
            AccountRole::Admin,
            CatalogReviewKind::Channel,
            "00000000-0000-4000-8000-000000000001".to_owned(),
            crate::domain::CatalogReviewStatus::Approved,
            CatalogReviewDecision::Reject,
            "   ".to_owned(),
        )
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn catalog_review_rejects_an_oversized_note_before_querying() {
    let result = service()
        .review(
            42,
            AccountRole::Admin,
            CatalogReviewKind::Model,
            "00000000-0000-4000-8000-000000000001".to_owned(),
            crate::domain::CatalogReviewStatus::Rejected,
            CatalogReviewDecision::Approve,
            "x".repeat(1_001),
        )
        .await;

    assert!(matches!(
        result,
        Err(CatalogReviewServiceError::InvalidInput)
    ));
}

#[test]
fn model_challenge_requires_exact_structure_and_random_markers() {
    let challenge = ModelVerificationChallenge::new();
    let content = serde_json::json!({
        "systemMarker": challenge.system_marker,
        "userMarker": challenge.user_marker,
        "result": challenge.expected_result,
    })
    .to_string();

    let result = evaluate_challenge_output(&challenge, &content);

    assert!(result.output_structure);
    assert!(result.input_fidelity);
    assert!(result.content_integrity);
}

#[test]
fn model_challenge_rejects_extra_output_and_memory_leakage() {
    let challenge = ModelVerificationChallenge::new();
    let content = serde_json::json!({
        "systemMarker": challenge.system_marker,
        "userMarker": challenge.user_marker,
        "result": challenge.expected_result,
        "memoryMarker": challenge.memory_marker,
    })
    .to_string();

    let result = evaluate_challenge_output(&challenge, &content);

    assert!(!result.output_structure);
    assert!(!result.content_integrity);
}

#[test]
fn model_identity_risk_requires_matching_observed_model() {
    let matching = vec!["gpt-test".to_owned()];
    let mismatching = vec!["different-model".to_owned()];

    assert_eq!(
        routing_consistency_status("gpt-test", &matching, 4, 4),
        CatalogReviewModelCheckStatus::Passed
    );
    assert_eq!(
        identity_risk(
            "gpt-test",
            &matching,
            true,
            CatalogReviewModelCheckStatus::Passed,
        ),
        CatalogReviewModelIdentityRisk::Low
    );
    assert_eq!(
        identity_risk(
            "gpt-test",
            &mismatching,
            false,
            CatalogReviewModelCheckStatus::Failed,
        ),
        CatalogReviewModelIdentityRisk::High
    );
}

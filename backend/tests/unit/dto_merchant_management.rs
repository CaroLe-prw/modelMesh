use serde_json::json;

use crate::domain::{
    ManagedMerchant, ManagedMerchantApplication, ManagedMerchantStatus, MerchantAccessStatus,
    MerchantReviewDecision,
};

use super::{
    BatchDeleteManagedMerchantsRequest, BatchDeleteManagedMerchantsResponse,
    BatchUpdateManagedMerchantStatusRequest, BatchUpdateManagedMerchantStatusResponse,
    ManagedMerchantAccessStatusValue, ManagedMerchantResponse, ManagedMerchantStatusValue,
    MerchantReviewDecisionValue, ReviewManagedMerchantRequest, UpdateManagedMerchantRequest,
    UpdateManagedMerchantStatusRequest,
};

#[test]
fn merchant_response_uses_camel_case_and_nullable_statistics() {
    let response = ManagedMerchantResponse::from(ManagedMerchant {
        id: 47,
        name: "Northstar AI".to_owned(),
        email: "ops@northstar.example".to_owned(),
        status: ManagedMerchantStatus::Pending,
        channel_count: None,
        model_count: None,
        balance_microusd: 4_826_720_000,
        concurrency_limit: 12,
        rpm_limit: 600,
        created_at: "2026-07-12T06:20:00Z"
            .parse()
            .expect("creation timestamp should be valid"),
        application: Some(ManagedMerchantApplication {
            application_code: "2026081714310912345".to_owned(),
            avatar_url: Some("https://example.com/avatar.png".to_owned()),
            website: Some("https://northstar.example".to_owned()),
            description: "Northstar AI merchant application details".to_owned(),
            submitted_at: "2026-08-17T06:31:09Z"
                .parse()
                .expect("submission timestamp should be valid"),
            updated_at: "2026-08-17T06:31:09Z"
                .parse()
                .expect("update timestamp should be valid"),
        }),
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["id"], json!(47));
    assert_eq!(value["name"], json!("Northstar AI"));
    assert_eq!(value["status"], json!("pending"));
    assert_eq!(value["channelCount"], json!(null));
    assert_eq!(value["modelCount"], json!(null));
    assert_eq!(value["balanceMicrousd"], json!(4_826_720_000_i64));
    assert_eq!(value["concurrencyLimit"], json!(12));
    assert_eq!(value["rpmLimit"], json!(600));
    assert_eq!(value["createdAt"], json!("2026-07-12T06:20:00Z"));
    assert_eq!(
        value["application"]["applicationCode"],
        json!("2026081714310912345")
    );
    assert_eq!(
        value["application"]["website"],
        json!("https://northstar.example")
    );
}

#[test]
fn merchant_batch_mutations_use_camel_case_ids_and_counts() {
    let status: BatchUpdateManagedMerchantStatusRequest = serde_json::from_value(json!({
        "userIds": [47, 48],
        "status": "disabled"
    }))
    .expect("batch merchant status should deserialize");
    let deletion: BatchDeleteManagedMerchantsRequest = serde_json::from_value(json!({
        "userIds": [47, 48]
    }))
    .expect("batch merchant deletion should deserialize");

    assert_eq!(status.user_ids, vec![47, 48]);
    assert_eq!(
        MerchantAccessStatus::from(status.status),
        MerchantAccessStatus::Disabled
    );
    assert_eq!(deletion.user_ids, vec![47, 48]);
    assert_eq!(
        serde_json::to_value(BatchUpdateManagedMerchantStatusResponse { updated_count: 2 })
            .expect("status response should serialize"),
        json!({ "updatedCount": 2 })
    );
    assert_eq!(
        serde_json::to_value(BatchDeleteManagedMerchantsResponse { deleted_count: 2 })
            .expect("deletion response should serialize"),
        json!({ "deletedCount": 2 })
    );
}

#[test]
fn merchant_mutations_use_the_public_camel_case_contract() {
    let update: UpdateManagedMerchantRequest = serde_json::from_value(json!({
        "name": "Northstar AI",
        "email": "ops@northstar.example",
        "concurrencyLimit": 12,
        "rpmLimit": 600
    }))
    .expect("merchant update should deserialize");
    let review: ReviewManagedMerchantRequest = serde_json::from_value(json!({
        "decision": "approved",
        "reviewNote": "资料核验通过"
    }))
    .expect("merchant review should deserialize");
    let status: UpdateManagedMerchantStatusRequest = serde_json::from_value(json!({
        "status": "disabled"
    }))
    .expect("merchant account status should deserialize");

    assert_eq!(update.name, "Northstar AI");
    assert_eq!(update.email, "ops@northstar.example");
    assert_eq!(update.concurrency_limit, 12);
    assert_eq!(update.rpm_limit, 600);
    assert_eq!(review.review_note, "资料核验通过");
    assert_eq!(
        MerchantReviewDecision::from(review.decision),
        MerchantReviewDecision::Approve
    );
    assert_eq!(
        MerchantReviewDecision::from(MerchantReviewDecisionValue::Rejected),
        MerchantReviewDecision::Reject
    );
    assert_eq!(
        MerchantAccessStatus::from(status.status),
        MerchantAccessStatus::Disabled
    );
    assert_eq!(
        MerchantAccessStatus::from(ManagedMerchantAccessStatusValue::Active),
        MerchantAccessStatus::Active
    );
}

#[test]
fn merchant_status_filter_matches_the_public_contract() {
    let pending: ManagedMerchantStatusValue =
        serde_json::from_value(json!("pending")).expect("pending status should deserialize");
    let rejected: ManagedMerchantStatusValue =
        serde_json::from_value(json!("rejected")).expect("rejected status should deserialize");

    assert_eq!(
        ManagedMerchantStatus::from(pending),
        ManagedMerchantStatus::Pending
    );
    assert_eq!(
        ManagedMerchantStatus::from(rejected),
        ManagedMerchantStatus::Rejected
    );
}

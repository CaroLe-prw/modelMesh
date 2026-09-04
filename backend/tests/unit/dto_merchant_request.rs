use serde_json::json;

use crate::domain::{
    MerchantOperationSource, MerchantRequest, MerchantRequestAction, MerchantRequestOrigin,
    MerchantRequestStatus, MerchantRequestType,
};

use super::{
    ListMerchantRequestsQuery, MerchantRequestResponse, MerchantRequestSortDirectionValue,
    MerchantRequestSortFieldValue,
};

#[test]
fn merchant_log_sort_defaults_to_newest_first() {
    let query = serde_json::from_value::<ListMerchantRequestsQuery>(json!({}))
        .expect("empty list query should use defaults");
    assert!(matches!(
        query.sort_order,
        MerchantRequestSortDirectionValue::Desc
    ));
    assert!(matches!(
        query.sort_by,
        MerchantRequestSortFieldValue::SubmittedAt
    ));

    let ascending = serde_json::from_value::<ListMerchantRequestsQuery>(json!({
        "sortOrder": "asc"
    }))
    .expect("ascending sort should deserialize");
    assert!(matches!(
        ascending.sort_order,
        MerchantRequestSortDirectionValue::Asc
    ));

    let updated = serde_json::from_value::<ListMerchantRequestsQuery>(json!({
        "sortBy": "updatedAt"
    }))
    .expect("update-time sort should deserialize");
    assert!(matches!(
        updated.sort_by,
        MerchantRequestSortFieldValue::UpdatedAt
    ));
}

#[test]
fn merchant_request_response_uses_camel_case_values() {
    let response = MerchantRequestResponse::from(MerchantRequest {
        id: "mr_0123456789ABCDEF0123456789ABCDEF".to_owned(),
        resource_id: "01234567-89ab-cdef-0123-456789abcdef".to_owned(),
        origin: MerchantRequestOrigin::ModelReview,
        action: Some(MerchantRequestAction::PriceChange),
        request_type: MerchantRequestType::ModelReview,
        subject: "Increase daily quota".to_owned(),
        description: "Increase the daily quota for production traffic.".to_owned(),
        status: MerchantRequestStatus::ChangesRequested,
        review_note: "Add a traffic forecast.".to_owned(),
        operator_user_id: Some(47),
        operator_source: MerchantOperationSource::Merchant,
        operation_reason: String::new(),
        submitted_at: "2026-08-31T02:00:00Z"
            .parse()
            .expect("submission timestamp should be valid"),
        updated_at: "2026-08-31T03:00:00Z"
            .parse()
            .expect("update timestamp should be valid"),
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["requestType"], json!("modelReview"));
    assert_eq!(value["origin"], json!("modelReview"));
    assert_eq!(value["action"], json!("priceChange"));
    assert_eq!(value["status"], json!("changesRequested"));
    assert_eq!(value["reviewNote"], json!("Add a traffic forecast."));
    assert!(value.get("submitted_at").is_none());
}

#[test]
fn lifecycle_event_response_exposes_completed_delete_action() {
    let occurred_at = "2026-08-31T04:00:00Z"
        .parse()
        .expect("event timestamp should be valid");
    let response = MerchantRequestResponse::from(MerchantRequest {
        id: "event_17".to_owned(),
        resource_id: "00000000-0000-4000-8000-000000000002".to_owned(),
        origin: MerchantRequestOrigin::ModelLifecycle,
        action: Some(MerchantRequestAction::Delete),
        request_type: MerchantRequestType::ModelOperation,
        subject: "gpt-5.6-luna".to_owned(),
        description: String::new(),
        status: MerchantRequestStatus::Completed,
        review_note: String::new(),
        operator_user_id: Some(1),
        operator_source: MerchantOperationSource::Admin,
        operation_reason: "Repeated upstream failures".to_owned(),
        submitted_at: occurred_at,
        updated_at: occurred_at,
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["origin"], json!("modelLifecycle"));
    assert_eq!(value["action"], json!("delete"));
    assert_eq!(value["requestType"], json!("modelOperation"));
    assert_eq!(value["status"], json!("completed"));
    assert_eq!(value["operatorUserId"], json!(1));
    assert_eq!(value["operatorSource"], json!("admin"));
    assert_eq!(
        value["operationReason"],
        json!("Repeated upstream failures")
    );
}

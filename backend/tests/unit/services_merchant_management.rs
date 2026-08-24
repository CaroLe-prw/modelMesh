use crate::{
    domain::{AccountRole, MerchantAccessStatus, MerchantReviewDecision, Pagination},
    state::AppState,
};

use super::{
    MerchantManagementService, MerchantManagementServiceError, ReviewManagedMerchant,
    UpdateManagedMerchant,
};

fn service() -> MerchantManagementService {
    AppState::for_test().merchant_management_service
}

#[tokio::test]
async fn merchant_update_validates_name_and_email_before_querying() {
    let result = service()
        .update(
            AccountRole::Admin,
            47,
            UpdateManagedMerchant {
                name: "x".to_owned(),
                email: "not-an-email".to_owned(),
                concurrency_limit: 1,
                rpm_limit: 0,
            },
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_update_rejects_request_limits_outside_unsigned_32_bit_range() {
    let result = service()
        .update(
            AccountRole::Admin,
            47,
            UpdateManagedMerchant {
                name: "Northstar AI".to_owned(),
                email: "ops@northstar.example".to_owned(),
                concurrency_limit: -1,
                rpm_limit: i64::from(u32::MAX) + 1,
            },
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_review_rejects_self_review_before_querying() {
    let result = service()
        .review(
            47,
            AccountRole::Admin,
            47,
            ReviewManagedMerchant {
                decision: MerchantReviewDecision::Approve,
                review_note: String::new(),
            },
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_list_requires_an_administrator() {
    let result = service()
        .list(
            AccountRole::Merchant,
            Pagination::new(1, 20).expect("pagination should be valid"),
            None,
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::Forbidden)
    ));
}

#[tokio::test]
async fn merchant_list_rejects_an_invalid_search_before_querying() {
    let result = service()
        .list(
            AccountRole::Admin,
            Pagination::new(1, 20).expect("pagination should be valid"),
            Some("x".repeat(257)),
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_status_update_requires_an_administrator() {
    let result = service()
        .update_status(AccountRole::Merchant, 47, MerchantAccessStatus::Disabled)
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::Forbidden)
    ));
}

#[tokio::test]
async fn merchant_status_update_rejects_an_invalid_user_id_before_querying() {
    let result = service()
        .update_status(AccountRole::Admin, 0, MerchantAccessStatus::Disabled)
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_batch_status_rejects_an_empty_selection_before_querying() {
    let result = service()
        .update_status_batch(
            AccountRole::Admin,
            Vec::new(),
            MerchantAccessStatus::Disabled,
        )
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

#[tokio::test]
async fn merchant_batch_mutations_require_an_administrator() {
    let status_result = service()
        .update_status_batch(
            AccountRole::Merchant,
            vec![47],
            MerchantAccessStatus::Disabled,
        )
        .await;
    let removal_result = service()
        .remove_batch(AccountRole::Merchant, vec![47])
        .await;

    assert!(matches!(
        status_result,
        Err(MerchantManagementServiceError::Forbidden)
    ));
    assert!(matches!(
        removal_result,
        Err(MerchantManagementServiceError::Forbidden)
    ));
}

#[tokio::test]
async fn merchant_batch_removal_rejects_more_than_one_hundred_ids_before_querying() {
    let result = service()
        .remove_batch(AccountRole::Admin, (1..=101).collect())
        .await;

    assert!(matches!(
        result,
        Err(MerchantManagementServiceError::InvalidInput)
    ));
}

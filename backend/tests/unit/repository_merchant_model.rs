use sea_orm::{DatabaseBackend, QueryTrait};

use crate::domain::{MerchantModelReviewStatus, MerchantModelStatus};

use super::{merchant_model_list_query, merchant_model_review_status, merchant_model_status};

#[test]
fn merchant_model_list_is_owner_scoped_and_stably_sorted() {
    let sql = merchant_model_list_query(42)
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(
        sql.contains(r#""merchant_model_listings"."merchant_user_id" = 42"#),
        "{sql}"
    );
    assert!(
        sql.contains(
            r#"ORDER BY "merchant_model_listings"."updated_at" DESC, "merchant_model_listings"."id" DESC"#
        ),
        "{sql}"
    );
}

#[test]
fn runtime_and_review_statuses_are_parsed_independently() {
    assert_eq!(
        merchant_model_status("published").expect("published should be a valid runtime status"),
        MerchantModelStatus::Published
    );
    assert_eq!(
        merchant_model_review_status("rejected").expect("rejected should be a valid review status"),
        MerchantModelReviewStatus::Rejected
    );
    assert!(merchant_model_status("rejected").is_err());
    assert!(merchant_model_review_status("offline").is_err());
}

#[test]
fn offline_listing_status_is_a_runtime_state_only() {
    assert_eq!(
        merchant_model_status("offline").expect("offline should be a valid listing status"),
        MerchantModelStatus::Offline
    );
}

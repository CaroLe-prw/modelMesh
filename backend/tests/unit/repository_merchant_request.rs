use sea_orm::{DbBackend, QueryTrait};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        MerchantOperationSource, MerchantRequestAction, MerchantRequestOrigin,
        MerchantRequestSortField, MerchantRequestStatus, MerchantRequestType, SortDirection,
    },
    entity::merchant_business_log,
};

use super::{
    MerchantRequestSearch, latest_channel_operation_query, latest_channel_operations_query,
    latest_model_operation_query, merchant_business_log_query, merchant_request_from_model,
};

fn timestamp(seconds: i64) -> OffsetDateTime {
    OffsetDateTime::from_unix_timestamp(seconds).expect("test timestamp should be valid")
}

#[test]
fn completed_delete_log_maps_to_the_public_request_shape() {
    let request = merchant_request_from_model(merchant_business_log::Model {
        id: 17,
        merchant_user_id: 7,
        origin: "model_lifecycle".to_owned(),
        resource_type: "model".to_owned(),
        resource_id: Uuid::parse_str("00000000-0000-4000-8000-000000000002")
            .expect("resource id should be valid"),
        request_type: "model_operation".to_owned(),
        subject: "gpt-5.6-luna".to_owned(),
        description: "GPT-5.6 Luna".to_owned(),
        action: Some("delete".to_owned()),
        status: "completed".to_owned(),
        review_note: String::new(),
        operator_user_id: Some(1),
        operator_source: "admin".to_owned(),
        operation_reason: "Repeated upstream failures".to_owned(),
        submitted_at: timestamp(1_788_140_200),
        updated_at: timestamp(1_788_140_200),
    })
    .expect("business log should map");

    assert_eq!(request.id, "log_17");
    assert_eq!(request.origin, MerchantRequestOrigin::ModelLifecycle);
    assert_eq!(request.action, Some(MerchantRequestAction::Delete));
    assert_eq!(request.request_type, MerchantRequestType::ModelOperation);
    assert_eq!(request.status, MerchantRequestStatus::Completed);
    assert_eq!(request.operator_user_id, Some(1));
    assert_eq!(request.operator_source, MerchantOperationSource::Admin);
    assert_eq!(request.operation_reason, "Repeated upstream failures");
}

#[test]
fn cancelled_review_log_maps_without_losing_its_action() {
    let request = merchant_request_from_model(merchant_business_log::Model {
        id: 18,
        merchant_user_id: 7,
        origin: "channel_review".to_owned(),
        resource_type: "channel".to_owned(),
        resource_id: Uuid::parse_str("00000000-0000-4000-8000-000000000003")
            .expect("resource id should be valid"),
        request_type: "channel_access".to_owned(),
        subject: "APAC direct".to_owned(),
        description: "Dedicated APAC capacity".to_owned(),
        action: Some("publish".to_owned()),
        status: "cancelled".to_owned(),
        review_note: String::new(),
        operator_user_id: Some(7),
        operator_source: "merchant".to_owned(),
        operation_reason: String::new(),
        submitted_at: timestamp(1_788_140_100),
        updated_at: timestamp(1_788_140_200),
    })
    .expect("business log should map");

    assert_eq!(request.origin, MerchantRequestOrigin::ChannelReview);
    assert_eq!(request.action, Some(MerchantRequestAction::Publish));
    assert_eq!(request.status, MerchantRequestStatus::Cancelled);
}

#[test]
fn business_log_query_is_owner_scoped_searchable_and_status_filtered() {
    let search = MerchantRequestSearch {
        exact_id: Some(17),
        model_only: false,
        pattern: Some("%gpt\\_%".to_owned()),
        status: Some(MerchantRequestStatus::Completed),
    };
    let statement = merchant_business_log_query(
        7,
        &search,
        MerchantRequestSortField::SubmittedAt,
        SortDirection::Desc,
    )
    .build(DbBackend::Postgres);
    let sql = statement.to_string();

    assert!(sql.contains(r#"merchant_business_logs"."merchant_user_id" = 7"#));
    assert!(sql.contains(r#"merchant_business_logs"."id" = 17"#));
    assert!(sql.contains("ILIKE"));
    assert!(sql.contains(r#""merchant_business_logs"."operation_reason" ILIKE"#));
    assert!(sql.contains(r#"merchant_business_logs"."status" = 'completed'"#));
    assert!(sql.contains("ORDER BY"));
    assert!(sql.contains(r#"merchant_business_logs"."submitted_at" DESC"#));
}

#[test]
fn business_log_query_can_reverse_occurrence_time_order() {
    let search = MerchantRequestSearch {
        exact_id: None,
        model_only: false,
        pattern: None,
        status: None,
    };
    let statement = merchant_business_log_query(
        7,
        &search,
        MerchantRequestSortField::SubmittedAt,
        SortDirection::Asc,
    )
    .build(DbBackend::Postgres);

    assert!(
        statement
            .to_string()
            .contains(r#"merchant_business_logs"."submitted_at" ASC"#)
    );
}

#[test]
fn business_log_query_can_sort_by_update_time() {
    let search = MerchantRequestSearch {
        exact_id: None,
        model_only: false,
        pattern: None,
        status: None,
    };
    let statement = merchant_business_log_query(
        7,
        &search,
        MerchantRequestSortField::UpdatedAt,
        SortDirection::Desc,
    )
    .build(DbBackend::Postgres);

    assert!(
        statement
            .to_string()
            .contains(r#"merchant_business_logs"."updated_at" DESC"#)
    );
}

#[test]
fn business_log_query_can_limit_results_to_model_resources() {
    let search = MerchantRequestSearch {
        exact_id: None,
        model_only: true,
        pattern: None,
        status: None,
    };
    let statement = merchant_business_log_query(
        47,
        &search,
        MerchantRequestSortField::SubmittedAt,
        SortDirection::Desc,
    )
    .build(DbBackend::Postgres)
    .to_string();

    assert!(statement.contains(r#"merchant_business_logs"."merchant_user_id" = 47"#));
    assert!(statement.contains(r#"merchant_business_logs"."resource_type" = 'model'"#));
}

#[test]
fn latest_channel_operation_is_scoped_to_the_owner_and_channel() {
    let channel_id = Uuid::parse_str("00000000-0000-4000-8000-000000000003")
        .expect("channel id should be valid");
    let sql = latest_channel_operation_query(47, channel_id)
        .build(DbBackend::Postgres)
        .to_string();

    for predicate in [
        r#""merchant_business_logs"."merchant_user_id" = 47"#,
        r#""merchant_business_logs"."resource_type" = 'channel'"#,
        r#""merchant_business_logs"."resource_id" = '00000000-0000-4000-8000-000000000003'"#,
        r#""merchant_business_logs"."origin" = 'channel_lifecycle'"#,
    ] {
        assert!(sql.contains(predicate), "missing {predicate} in {sql}");
    }
    assert!(sql.contains(r#"ORDER BY "merchant_business_logs"."submitted_at" DESC"#));
}

#[test]
fn latest_channel_operations_return_one_entry_per_channel() {
    let sql = latest_channel_operations_query(47)
        .build(DbBackend::Postgres)
        .to_string();

    assert!(sql.contains(r#"DISTINCT ON ("resource_id")"#), "{sql}");
    assert!(
        sql.contains(
            r#"ORDER BY "merchant_business_logs"."resource_id" ASC, "merchant_business_logs"."submitted_at" DESC, "merchant_business_logs"."id" DESC"#,
        ),
        "{sql}"
    );
}

#[test]
fn latest_model_operation_is_scoped_to_the_owner_and_listing() {
    let listing_id = Uuid::parse_str("00000000-0000-4000-8000-000000000004")
        .expect("listing id should be valid");
    let sql = latest_model_operation_query(47, listing_id)
        .build(DbBackend::Postgres)
        .to_string();

    for predicate in [
        r#""merchant_business_logs"."merchant_user_id" = 47"#,
        r#""merchant_business_logs"."resource_type" = 'model'"#,
        r#""merchant_business_logs"."resource_id" = '00000000-0000-4000-8000-000000000004'"#,
        r#""merchant_business_logs"."origin" = 'model_lifecycle'"#,
    ] {
        assert!(sql.contains(predicate), "missing {predicate} in {sql}");
    }
}

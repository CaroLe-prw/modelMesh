use sea_orm::{DatabaseBackend, EntityTrait, QueryFilter, QueryTrait};
use uuid::Uuid;

use crate::{
    domain::{CatalogReviewDecision, CatalogReviewStatus, MerchantChannelStatus},
    entity::{merchant_channel, merchant_model_listing},
    repository::CatalogReviewSearch,
};

use super::{
    approved_price_effective_at, channel_connection_query, channel_expected_status_condition,
    channel_review_list_query, channel_review_state, channel_review_update_status,
    model_connection_query, model_expected_status_condition, model_review_list_query,
};

#[test]
fn approved_price_uses_the_configured_effective_delay() {
    let approved_at = time::OffsetDateTime::from_unix_timestamp(1_700_000_000)
        .expect("test timestamp should be valid");

    assert_eq!(
        approved_price_effective_at(approved_at, 0).expect("zero delay should be valid"),
        None
    );
    assert_eq!(
        approved_price_effective_at(approved_at, 24).expect("delay should be valid"),
        Some(approved_at + time::Duration::hours(24))
    );
}

#[test]
fn channel_review_decision_maps_directly_to_the_unified_status() {
    assert_eq!(
        channel_review_state(CatalogReviewDecision::Approve),
        MerchantChannelStatus::Active
    );
    assert_eq!(
        channel_review_state(CatalogReviewDecision::Reject),
        MerchantChannelStatus::Rejected
    );
}

#[test]
fn completed_review_statuses_map_to_their_current_database_states() {
    let approved_channel = merchant_channel::Entity::find()
        .filter(channel_expected_status_condition(
            CatalogReviewStatus::Approved,
        ))
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(
        approved_channel.contains(r#""merchant_channels"."status" = 'active'"#),
        "{approved_channel}"
    );
    assert!(
        approved_channel.contains(r#""merchant_channels"."status" = 'offline'"#),
        "{approved_channel}"
    );
    let approved_model = merchant_model_listing::Entity::find()
        .filter(model_expected_status_condition(
            CatalogReviewStatus::Approved,
        ))
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(
        approved_model.contains(r#""merchant_model_listings"."review_status" = 'approved'"#),
        "{approved_model}"
    );
}

#[test]
fn approving_an_approved_channel_preserves_its_runtime_state() {
    assert_eq!(
        channel_review_update_status(
            CatalogReviewStatus::Approved,
            CatalogReviewDecision::Approve,
        ),
        None
    );
    assert_eq!(
        channel_review_update_status(
            CatalogReviewStatus::Rejected,
            CatalogReviewDecision::Approve,
        ),
        Some(MerchantChannelStatus::Active)
    );
    assert_eq!(
        channel_review_update_status(CatalogReviewStatus::Approved, CatalogReviewDecision::Reject,),
        Some(MerchantChannelStatus::Rejected)
    );
}

#[test]
fn channel_connection_query_reads_only_the_stored_connection_fields() {
    let id = Uuid::parse_str("00000000-0000-4000-8000-000000000001").expect("valid UUID");
    let sql = channel_connection_query(id)
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(sql.contains(r#""merchant_channels"."base_url""#), "{sql}");
    assert!(
        sql.contains(r#""merchant_channels"."api_key_ciphertext""#),
        "{sql}"
    );
    assert!(
        sql.contains(r#""merchant_channels"."provider_identifier" AS "provider_id""#),
        "{sql}"
    );
    assert!(
        !sql.contains(r#""merchant_channels"."description""#),
        "{sql}"
    );
}

#[test]
fn model_connection_query_joins_the_review_to_its_channel_and_model() {
    let id = Uuid::parse_str("00000000-0000-4000-8000-000000000001").expect("valid UUID");
    let sql = model_connection_query(id)
        .build(DatabaseBackend::Postgres)
        .to_string();

    assert!(sql.contains(r#"JOIN "merchant_channels""#), "{sql}");
    assert!(sql.contains(r#"JOIN "models""#), "{sql}");
    assert!(
        sql.contains(r#""merchant_channels"."api_key_ciphertext""#),
        "{sql}"
    );
    assert!(sql.contains(r#""models"."identifier""#), "{sql}");
}

#[test]
fn channel_review_query_joins_merchant_and_provider_and_is_stably_sorted() {
    let sql = channel_review_list_query(&CatalogReviewSearch {
        exact_channel_id: None,
        exact_id: None,
        pattern: Some("%northstar%".to_owned()),
        status: None,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(sql.contains(r#"JOIN "users""#), "{sql}");
    assert!(sql.contains(r#"JOIN "brands""#), "{sql}");
    assert!(
        sql.contains(r#""merchant_channels"."review_note""#),
        "{sql}"
    );
    assert!(sql.contains("ILIKE"), "{sql}");
    assert!(
        sql.contains(
            r#"ORDER BY "merchant_channels"."review_submitted_at" DESC, "merchant_channels"."id" DESC"#
        ),
        "{sql}"
    );
}

#[test]
fn model_review_query_maps_public_status_to_listing_workflow() {
    let sql = model_review_list_query(&CatalogReviewSearch {
        exact_channel_id: None,
        exact_id: None,
        pattern: None,
        status: Some(crate::domain::CatalogReviewStatus::Pending),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(sql.contains(r#"JOIN "merchant_channels""#), "{sql}");
    assert!(sql.contains(r#"JOIN "models""#), "{sql}");
    assert!(
        sql.contains(r#""merchant_channels"."public_id" AS "channel_id""#),
        "{sql}"
    );
    assert!(
        sql.contains(r#""merchant_model_listings"."review_note""#),
        "{sql}"
    );
    assert!(
        sql.contains(r#""merchant_model_listings"."review_status" = 'pending'"#),
        "{sql}"
    );
}

#[test]
fn model_review_query_matches_review_or_channel_id() {
    let id = Uuid::parse_str("00000000-0000-4000-8000-000000000002").expect("valid UUID");
    let sql = model_review_list_query(&CatalogReviewSearch {
        exact_channel_id: None,
        exact_id: Some(id),
        pattern: None,
        status: None,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(
        sql.contains(r#""merchant_model_listings"."id" = '00000000-0000-4000-8000-000000000002'"#),
        "{sql}"
    );
    assert!(
        sql.contains(
            r#""merchant_model_listings"."channel_id" = '00000000-0000-4000-8000-000000000002'"#
        ),
        "{sql}"
    );
    assert!(sql.contains(" OR "), "{sql}");
}

#[test]
fn channel_review_query_matches_public_channel_id() {
    let sql = channel_review_list_query(&CatalogReviewSearch {
        exact_channel_id: Some(42),
        exact_id: None,
        pattern: None,
        status: None,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(
        sql.contains(r#""merchant_channels"."public_id" = 42"#),
        "{sql}"
    );
}

#[test]
fn approved_channel_review_filter_includes_active_and_offline_channels() {
    let sql = channel_review_list_query(&CatalogReviewSearch {
        exact_channel_id: None,
        exact_id: None,
        pattern: None,
        status: Some(CatalogReviewStatus::Approved),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(
        sql.contains(r#""merchant_channels"."status" = 'active'"#),
        "{sql}"
    );
    assert!(
        sql.contains(r#""merchant_channels"."status" = 'offline'"#),
        "{sql}"
    );
    assert!(sql.contains(" OR "), "{sql}");
}

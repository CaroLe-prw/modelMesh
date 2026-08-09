use jiff::Timestamp;

use sea_orm::{DbBackend, QueryTrait};

use super::{ApiKeySearch, api_key_list_query, database_timestamp, domain_timestamp};
use crate::domain::ApiKeyStatus;

#[test]
fn database_timestamp_adapter_preserves_the_instant() {
    let timestamp = "2026-08-07T03:45:12.123456789Z"
        .parse::<Timestamp>()
        .expect("test timestamp should be valid");
    let database_value =
        database_timestamp(timestamp).expect("timestamp should fit the database adapter");
    let round_trip = domain_timestamp(database_value).expect("database timestamp should fit Jiff");

    assert_eq!(round_trip, timestamp);
}

#[test]
fn list_query_keeps_search_status_and_stable_sorting_contract() {
    let search = ApiKeySearch {
        exact_key_hash: Some("full-key-hash".to_owned()),
        pattern: Some(r"%key\_\%%".to_owned()),
        status: Some(ApiKeyStatus::Paused),
    };
    let sql = api_key_list_query(42, &search)
        .build(DbBackend::Postgres)
        .to_string();

    assert!(sql.contains("ILIKE"), "{sql}");
    assert!(sql.contains("ESCAPE E'\\\\'"), "{sql}");
    assert!(sql.contains("||"), "{sql}");
    assert!(sql.contains("\"key_hash\" = 'full-key-hash'"), "{sql}");
    assert!(sql.contains("\"status\" = 'paused'"), "{sql}");
    assert!(
        sql.contains("ORDER BY \"api_keys\".\"created_at\" DESC, \"api_keys\".\"id\" DESC"),
        "{sql}"
    );
}

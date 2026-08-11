use std::io;

use super::{RedisClient, parse_linked_values};

#[test]
fn linked_lookup_distinguishes_missing_token_and_missing_related_cache() {
    assert_eq!(
        parse_linked_values(Vec::new()).expect("missing token"),
        None
    );
    assert_eq!(
        parse_linked_values(vec!["42".to_owned(), String::new()]).expect("missing cache"),
        Some(("42".to_owned(), None))
    );
    assert_eq!(
        parse_linked_values(vec!["42".to_owned(), "cached-user".to_owned()]).expect("cached user"),
        Some(("42".to_owned(), Some("cached-user".to_owned())))
    );
}

#[test]
fn linked_lookup_rejects_malformed_responses() {
    assert!(parse_linked_values(vec!["42".to_owned()]).is_err());
    assert!(parse_linked_values(vec![String::new(), String::new()]).is_err());
}

#[tokio::test]
async fn set_nx_rejects_zero_ttl_before_acquiring_a_connection() {
    let pool = deadpool_redis::Config::from_url("redis://127.0.0.1/")
        .create_pool(Some(deadpool_redis::Runtime::Tokio1))
        .expect("test Redis URL should be valid");
    let error = RedisClient::new(pool)
        .set_nx_with_ttl("test:key", "value", 0)
        .await
        .expect_err("zero TTL must be rejected");

    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
}

#[tokio::test]
async fn set_rejects_zero_ttl_before_acquiring_a_connection() {
    let pool = deadpool_redis::Config::from_url("redis://127.0.0.1/")
        .create_pool(Some(deadpool_redis::Runtime::Tokio1))
        .expect("test Redis URL should be valid");
    let error = RedisClient::new(pool)
        .set_with_ttl("test:key", "value", 0)
        .await
        .expect_err("zero TTL must be rejected");

    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
}

#[tokio::test]
async fn deleting_no_keys_does_not_acquire_a_connection() {
    let pool = deadpool_redis::Config::from_url("redis://127.0.0.1/")
        .create_pool(Some(deadpool_redis::Runtime::Tokio1))
        .expect("test Redis URL should be valid");
    let deleted = RedisClient::new(pool)
        .delete_many(&[])
        .await
        .expect("empty deletion should succeed");

    assert_eq!(deleted, 0);
}

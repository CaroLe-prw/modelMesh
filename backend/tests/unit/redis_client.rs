use std::io;

use super::RedisClient;

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

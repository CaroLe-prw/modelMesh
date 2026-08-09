use super::{access_token, account_routes, ttl};

#[test]
fn keys_use_the_modelmesh_namespace() {
    assert_eq!(
        access_token("hashed-token"),
        "modelmesh:auth:access-token:hashed-token"
    );
    assert_eq!(account_routes(42), "modelmesh:account-routes:user:42");
}

#[test]
fn default_redis_ttls_are_centralized() {
    assert_eq!(ttl::ACCESS_TOKEN_SECONDS, 86_400);
    assert_eq!(ttl::ACCOUNT_ROUTES_SECONDS, 86_400);
}

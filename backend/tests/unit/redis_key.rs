use super::{
    access_token, account_route_matrix, account_routes, current_user, current_user_prefix, ttl,
};

#[test]
fn keys_use_the_modelmesh_namespace() {
    assert_eq!(
        access_token("hashed-token"),
        "modelmesh:auth:access-token:hashed-token"
    );
    assert_eq!(account_routes(42), "modelmesh:account-routes:v8:user:42");
    assert_eq!(
        account_route_matrix(),
        "modelmesh:account-routes:v8:admin:matrix"
    );
    assert_eq!(current_user(42), "modelmesh:auth:user:v1:42");
    assert_eq!(current_user_prefix(), "modelmesh:auth:user:v1:");
}

#[test]
fn default_redis_ttls_are_centralized() {
    assert_eq!(ttl::ACCESS_TOKEN_SECONDS, 86_400);
    assert_eq!(ttl::ACCOUNT_ROUTES_SECONDS, 86_400);
    assert_eq!(ttl::CURRENT_USER_SECONDS, 86_400);
}

use super::access_token_key;

#[test]
fn access_token_key_is_namespaced() {
    assert_eq!(
        access_token_key("hashed-token"),
        "modelmesh:auth:access-token:hashed-token"
    );
}

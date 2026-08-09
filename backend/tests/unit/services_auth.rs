use super::{generate_access_token, normalize_email, validate_password};
use crate::security::hash_secret;

#[test]
fn email_is_normalized() {
    assert_eq!(
        normalize_email("  User@Example.com "),
        Some("user@example.com".to_owned())
    );
}

#[test]
fn malformed_email_is_rejected() {
    assert_eq!(normalize_email("user@example"), None);
    assert_eq!(normalize_email("@example.com"), None);
}

#[test]
fn password_length_is_validated() {
    assert!(validate_password("eight888").is_ok());
    assert!(validate_password("short").is_err());
}

#[test]
fn access_token_has_expected_format_and_hash() {
    let token = generate_access_token();
    let token_hash = hash_secret(&token);

    assert_eq!(token.len(), 64);
    assert!(token.bytes().all(|byte| byte.is_ascii_hexdigit()));
    assert_eq!(token_hash.len(), 64);
    assert_ne!(token, token_hash);
    assert_eq!(
        hash_secret("abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

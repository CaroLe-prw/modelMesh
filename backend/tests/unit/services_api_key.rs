use super::{
    build_search, generate_api_key, normalize_ip_rules, usd_to_microusd, validate_custom_key,
    validate_expiration,
};

#[test]
fn generated_api_key_has_expected_format() {
    let key = generate_api_key();

    assert_eq!(key.len(), 67);
    assert!(key.starts_with("sk-"));
    assert!(key[3..].bytes().all(|byte| byte.is_ascii_hexdigit()));
}

#[test]
fn custom_api_key_must_match_public_contract() {
    assert!(validate_custom_key("valid_custom-key_123".to_owned()).is_ok());
    assert!(validate_custom_key("too-short".to_owned()).is_err());
    assert!(validate_custom_key("invalid key with spaces".to_owned()).is_err());
}

#[test]
fn ip_rules_are_trimmed_and_validated() {
    assert_eq!(
        normalize_ip_rules(" 192.168.1.1 \n\n 10.0.0.0/8 ").expect("rules should be valid"),
        "192.168.1.1\n10.0.0.0/8"
    );
    assert!(normalize_ip_rules("10.0.0.0/33").is_err());
    assert!(normalize_ip_rules("not-an-ip").is_err());
}

#[test]
fn money_is_stored_as_integer_microusd() {
    assert_eq!(usd_to_microusd(12.345678), Ok(12_345_678));
    assert!(usd_to_microusd(-1.0).is_err());
    assert!(usd_to_microusd(f64::INFINITY).is_err());
}

#[test]
fn expiration_requires_a_future_rfc3339_timestamp() {
    assert!(validate_expiration("2999-01-01T00:00:00Z".to_owned()).is_ok());
    assert!(validate_expiration("2000-01-01T00:00:00Z".to_owned()).is_err());
    assert!(validate_expiration("tomorrow".to_owned()).is_err());
}

#[test]
fn search_matches_literals_and_hashes_full_keys() {
    let search = build_search(Some(r"  key_%\name  ".to_owned())).expect("search should be valid");

    assert_eq!(search.pattern.as_deref(), Some(r"%key\_\%\\name%"));
    assert_eq!(
        search.exact_key_hash.as_deref(),
        Some(crate::security::hash_secret(r"key_%\name").as_str())
    );
}

#[test]
fn empty_search_is_treated_as_no_filter() {
    let search = build_search(Some("   ".to_owned())).expect("empty search should be valid");

    assert_eq!(search.pattern, None);
    assert_eq!(search.exact_key_hash, None);
    assert_eq!(search.status, None);
}

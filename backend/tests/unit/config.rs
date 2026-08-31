use super::{
    AppEnvironment, DEFAULT_BIND_ADDRESS, DEFAULT_MODELS_DEV_CATALOG_URL,
    DEFAULT_MODELS_DEV_CONNECT_TIMEOUT_SECONDS, DEFAULT_MODELS_DEV_MAX_ATTEMPTS,
    DEFAULT_MODELS_DEV_REQUEST_TIMEOUT_SECONDS, DEFAULT_MODELS_DEV_RETRY_DELAY_SECONDS,
    DEFAULT_MODELS_DEV_SYNC_INTERVAL_HOURS, parse_environment, parse_positive_u32,
    parse_positive_u64, parse_positive_usize, parse_provider_credential_secret,
    parse_socket_address,
};

#[test]
fn default_bind_address_is_valid() {
    assert!(parse_socket_address("TEST_ADDRESS", DEFAULT_BIND_ADDRESS).is_ok());
}

#[test]
fn environment_accepts_supported_values_case_insensitively() {
    assert_eq!(
        parse_environment("TEST_ENVIRONMENT", "Production").expect("environment should parse"),
        AppEnvironment::Production
    );
}

#[test]
fn database_query_logging_is_only_enabled_in_development() {
    assert!(AppEnvironment::Development.logs_database_queries());
    assert!(!AppEnvironment::Test.logs_database_queries());
    assert!(!AppEnvironment::Production.logs_database_queries());
}

#[test]
fn environment_rejects_unknown_values() {
    assert!(parse_environment("TEST_ENVIRONMENT", "staging").is_err());
}

#[test]
fn connection_count_must_be_positive() {
    assert!(parse_positive_u32("TEST_COUNT", "0").is_err());
    assert!(parse_positive_usize("TEST_COUNT", "0").is_err());
}

#[test]
fn timeout_must_be_positive() {
    assert!(parse_positive_u64("TEST_TIMEOUT", "0").is_err());
}

#[test]
fn models_dev_sync_defaults_to_twenty_four_hours() {
    assert_eq!(DEFAULT_MODELS_DEV_SYNC_INTERVAL_HOURS, 24);
}

#[test]
fn models_dev_http_defaults_allow_retrying_a_large_catalog() {
    assert_eq!(
        DEFAULT_MODELS_DEV_CATALOG_URL,
        "https://models.dev/api.json"
    );
    assert_eq!(DEFAULT_MODELS_DEV_CONNECT_TIMEOUT_SECONDS, 10);
    assert_eq!(DEFAULT_MODELS_DEV_REQUEST_TIMEOUT_SECONDS, 120);
    assert_eq!(DEFAULT_MODELS_DEV_MAX_ATTEMPTS, 3);
    assert_eq!(DEFAULT_MODELS_DEV_RETRY_DELAY_SECONDS, 2);
}

#[test]
fn provider_credentials_require_an_explicit_production_secret() {
    assert!(parse_provider_credential_secret(AppEnvironment::Production, None).is_err());
    assert!(
        parse_provider_credential_secret(AppEnvironment::Production, Some("too-short")).is_err()
    );
    let (_, is_default) = parse_provider_credential_secret(
        AppEnvironment::Production,
        Some("a-production-provider-secret-with-32-characters"),
    )
    .expect("a sufficiently long production secret should be accepted");
    assert!(!is_default);
}

#[test]
fn development_provider_credentials_have_an_explicit_default() {
    let (_, is_default) = parse_provider_credential_secret(AppEnvironment::Development, None)
        .expect("development should have a local-only default");
    assert!(is_default);
}

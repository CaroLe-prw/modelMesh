use super::{
    AppEnvironment, DEFAULT_BIND_ADDRESS, parse_environment, parse_positive_u32,
    parse_positive_u64, parse_positive_usize, parse_socket_address,
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

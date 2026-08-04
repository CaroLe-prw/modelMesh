use std::collections::HashSet;

use super::ErrorCode;

#[test]
fn public_error_codes_are_stable_and_unique() {
    let codes = [
        (ErrorCode::InvalidRequest, 10_001),
        (ErrorCode::InvalidEmail, 11_001),
        (ErrorCode::InvalidPassword, 11_002),
        (ErrorCode::EmailAlreadyExists, 11_003),
        (ErrorCode::InvalidCredentials, 11_004),
        (ErrorCode::Unauthenticated, 11_005),
        (ErrorCode::DependencyUnavailable, 90_001),
        (ErrorCode::Internal, 99_999),
    ];
    let unique_codes = codes
        .iter()
        .map(|(code, expected)| {
            assert_eq!(code.value(), *expected);
            code.value()
        })
        .collect::<HashSet<_>>();

    assert_eq!(unique_codes.len(), codes.len());
}

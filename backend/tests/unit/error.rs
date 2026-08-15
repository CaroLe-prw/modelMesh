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
        (ErrorCode::Forbidden, 11_006),
        (ErrorCode::InvalidApiKey, 12_001),
        (ErrorCode::ApiKeyNameAlreadyExists, 12_002),
        (ErrorCode::ApiKeyAlreadyExists, 12_003),
        (ErrorCode::ApiKeyNotFound, 12_004),
        (ErrorCode::AppRouteNotFound, 13_001),
        (ErrorCode::InvalidAppRouteRoles, 13_002),
        (ErrorCode::InvalidBrand, 14_001),
        (ErrorCode::BrandAlreadyExists, 14_002),
        (ErrorCode::BrandPresetNotFound, 14_003),
        (ErrorCode::BrandNotFound, 14_004),
        (ErrorCode::InvalidModelCatalogLookup, 15_001),
        (ErrorCode::ModelCatalogEntryNotFound, 15_002),
        (ErrorCode::InvalidModel, 16_001),
        (ErrorCode::ModelAlreadyExists, 16_002),
        (ErrorCode::ModelNotFound, 16_003),
        (ErrorCode::InvalidManagedUser, 17_001),
        (ErrorCode::ManagedUserNotFound, 17_002),
        (ErrorCode::InvalidBalanceAdjustment, 17_003),
        (ErrorCode::ManagedUserDeleteConflict, 17_004),
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

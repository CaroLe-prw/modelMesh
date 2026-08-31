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
        (ErrorCode::InvalidMerchantApplication, 18_001),
        (ErrorCode::MerchantApplicationAlreadyExists, 18_002),
        (ErrorCode::InvalidManagedMerchant, 18_003),
        (ErrorCode::ManagedMerchantNotFound, 18_004),
        (ErrorCode::MerchantReviewConflict, 18_005),
        (ErrorCode::InvalidMerchantChannel, 19_001),
        (ErrorCode::MerchantChannelNameAlreadyExists, 19_002),
        (ErrorCode::MerchantChannelNotFound, 19_003),
        (ErrorCode::MerchantChannelPendingReview, 19_004),
        (ErrorCode::MerchantChannelConnectionFailed, 19_005),
        (ErrorCode::MerchantChannelCredentialsRejected, 19_006),
        (ErrorCode::MerchantChannelReviewFieldsLocked, 19_007),
        (ErrorCode::InvalidMerchantModel, 20_001),
        (ErrorCode::MerchantModelAlreadyExists, 20_002),
        (ErrorCode::MerchantModelNotFound, 20_003),
        (ErrorCode::MerchantModelProviderMismatch, 20_004),
        (ErrorCode::MerchantModelPriceSettingsChanged, 20_005),
        (ErrorCode::InvalidPriceSettings, 21_001),
        (ErrorCode::InvalidCatalogReview, 22_001),
        (ErrorCode::CatalogReviewNotFound, 22_002),
        (ErrorCode::CatalogReviewConflict, 22_003),
        (ErrorCode::CatalogReviewModelTestFailed, 22_004),
        (ErrorCode::InvalidMerchantRequest, 23_001),
        (ErrorCode::InvalidMerchantProfile, 24_001),
        (ErrorCode::MerchantSettlementAccountLimit, 24_002),
        (ErrorCode::MerchantSettlementAccountNotFound, 24_003),
        (ErrorCode::MerchantSettlementOptionDisabled, 24_004),
        (ErrorCode::InvalidMerchantSettlementSettings, 24_005),
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

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

use crate::services::{
    ApiKeyServiceError, AppRouteServiceError, AuthServiceError, BrandPresetServiceError,
    BrandServiceError, CatalogReviewServiceError, MerchantApplicationServiceError,
    MerchantChannelServiceError, MerchantManagementServiceError, MerchantModelServiceError,
    MerchantProfileServiceError, MerchantRequestServiceError, ModelCatalogServiceError,
    ModelServiceError, PriceSettingsServiceError, SystemSettingsServiceError,
    UserManagementServiceError,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ErrorCode {
    InvalidRequest = 10_001,
    InvalidEmail = 11_001,
    InvalidPassword = 11_002,
    EmailAlreadyExists = 11_003,
    InvalidCredentials = 11_004,
    Unauthenticated = 11_005,
    Forbidden = 11_006,
    RegistrationDisabled = 11_007,
    InvalidApiKey = 12_001,
    ApiKeyNameAlreadyExists = 12_002,
    ApiKeyAlreadyExists = 12_003,
    ApiKeyNotFound = 12_004,
    AppRouteNotFound = 13_001,
    InvalidAppRouteRoles = 13_002,
    InvalidBrand = 14_001,
    BrandAlreadyExists = 14_002,
    BrandPresetNotFound = 14_003,
    BrandNotFound = 14_004,
    InvalidModelCatalogLookup = 15_001,
    ModelCatalogEntryNotFound = 15_002,
    InvalidModel = 16_001,
    ModelAlreadyExists = 16_002,
    ModelNotFound = 16_003,
    InvalidManagedUser = 17_001,
    ManagedUserNotFound = 17_002,
    InvalidBalanceAdjustment = 17_003,
    ManagedUserDeleteConflict = 17_004,
    InvalidMerchantApplication = 18_001,
    MerchantApplicationAlreadyExists = 18_002,
    InvalidManagedMerchant = 18_003,
    ManagedMerchantNotFound = 18_004,
    MerchantReviewConflict = 18_005,
    InvalidMerchantChannel = 19_001,
    MerchantChannelNameAlreadyExists = 19_002,
    MerchantChannelNotFound = 19_003,
    MerchantChannelPendingReview = 19_004,
    MerchantChannelConnectionFailed = 19_005,
    MerchantChannelCredentialsRejected = 19_006,
    MerchantChannelReviewFieldsLocked = 19_007,
    InvalidMerchantModel = 20_001,
    MerchantModelAlreadyExists = 20_002,
    MerchantModelNotFound = 20_003,
    MerchantModelProviderMismatch = 20_004,
    MerchantModelPriceSettingsChanged = 20_005,
    InvalidPriceSettings = 21_001,
    InvalidCatalogReview = 22_001,
    CatalogReviewNotFound = 22_002,
    CatalogReviewConflict = 22_003,
    CatalogReviewModelTestFailed = 22_004,
    InvalidMerchantRequest = 23_001,
    InvalidMerchantProfile = 24_001,
    MerchantSettlementAccountLimit = 24_002,
    MerchantSettlementAccountNotFound = 24_003,
    MerchantSettlementOptionDisabled = 24_004,
    InvalidSystemSettings = 25_001,
    DependencyUnavailable = 90_001,
    Internal = 99_999,
}

impl ErrorCode {
    pub const fn value(self) -> u32 {
        self as u32
    }
}

#[derive(Clone, Copy, Debug)]
pub enum AppError {
    InvalidRequest,
    InvalidEmail,
    InvalidPassword,
    EmailAlreadyExists,
    InvalidCredentials,
    Unauthenticated,
    Forbidden,
    RegistrationDisabled,
    InvalidApiKey,
    ApiKeyNameAlreadyExists,
    ApiKeyAlreadyExists,
    ApiKeyNotFound,
    AppRouteNotFound,
    InvalidAppRouteRoles,
    InvalidBrand,
    BrandAlreadyExists,
    BrandPresetNotFound,
    BrandNotFound,
    InvalidModelCatalogLookup,
    ModelCatalogEntryNotFound,
    InvalidModel,
    ModelAlreadyExists,
    ModelNotFound,
    InvalidManagedUser,
    ManagedUserNotFound,
    InvalidBalanceAdjustment,
    ManagedUserDeleteConflict,
    InvalidMerchantApplication,
    MerchantApplicationAlreadyExists,
    InvalidManagedMerchant,
    ManagedMerchantNotFound,
    MerchantReviewConflict,
    InvalidMerchantChannel,
    MerchantChannelNameAlreadyExists,
    MerchantChannelNotFound,
    MerchantChannelPendingReview,
    MerchantChannelConnectionFailed,
    MerchantChannelCredentialsRejected,
    MerchantChannelReviewFieldsLocked,
    InvalidMerchantModel,
    MerchantModelAlreadyExists,
    MerchantModelNotFound,
    MerchantModelProviderMismatch,
    MerchantModelPriceSettingsChanged,
    InvalidPriceSettings,
    InvalidCatalogReview,
    CatalogReviewNotFound,
    CatalogReviewConflict,
    CatalogReviewModelTestFailed,
    InvalidMerchantRequest,
    InvalidMerchantProfile,
    MerchantSettlementAccountLimit,
    MerchantSettlementAccountNotFound,
    MerchantSettlementOptionDisabled,
    InvalidSystemSettings,
    DependencyUnavailable,
    Internal,
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: u32,
}

impl From<AuthServiceError> for AppError {
    fn from(error: AuthServiceError) -> Self {
        match error {
            AuthServiceError::InvalidEmail => Self::InvalidEmail,
            AuthServiceError::InvalidPassword => Self::InvalidPassword,
            AuthServiceError::EmailAlreadyExists => Self::EmailAlreadyExists,
            AuthServiceError::InvalidCredentials => Self::InvalidCredentials,
            AuthServiceError::Unauthenticated => Self::Unauthenticated,
            AuthServiceError::RegistrationDisabled => Self::RegistrationDisabled,
            AuthServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ApiKeyServiceError> for AppError {
    fn from(error: ApiKeyServiceError) -> Self {
        match error {
            ApiKeyServiceError::Forbidden => Self::Forbidden,
            ApiKeyServiceError::InvalidInput => Self::InvalidApiKey,
            ApiKeyServiceError::NameAlreadyExists => Self::ApiKeyNameAlreadyExists,
            ApiKeyServiceError::KeyAlreadyExists => Self::ApiKeyAlreadyExists,
            ApiKeyServiceError::NotFound => Self::ApiKeyNotFound,
            ApiKeyServiceError::Internal => Self::Internal,
        }
    }
}

impl From<AppRouteServiceError> for AppError {
    fn from(error: AppRouteServiceError) -> Self {
        match error {
            AppRouteServiceError::Forbidden => Self::Forbidden,
            AppRouteServiceError::InvalidRoles => Self::InvalidAppRouteRoles,
            AppRouteServiceError::NotFound => Self::AppRouteNotFound,
            AppRouteServiceError::Internal => Self::Internal,
        }
    }
}

impl From<BrandPresetServiceError> for AppError {
    fn from(error: BrandPresetServiceError) -> Self {
        match error {
            BrandPresetServiceError::Forbidden => Self::Forbidden,
            BrandPresetServiceError::Internal => Self::Internal,
        }
    }
}

impl From<BrandServiceError> for AppError {
    fn from(error: BrandServiceError) -> Self {
        match error {
            BrandServiceError::Forbidden => Self::Forbidden,
            BrandServiceError::InvalidInput => Self::InvalidBrand,
            BrandServiceError::AlreadyExists => Self::BrandAlreadyExists,
            BrandServiceError::PresetNotFound => Self::BrandPresetNotFound,
            BrandServiceError::NotFound => Self::BrandNotFound,
            BrandServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ModelCatalogServiceError> for AppError {
    fn from(error: ModelCatalogServiceError) -> Self {
        match error {
            ModelCatalogServiceError::Forbidden => Self::Forbidden,
            ModelCatalogServiceError::InvalidInput => Self::InvalidModelCatalogLookup,
            ModelCatalogServiceError::NotFound => Self::ModelCatalogEntryNotFound,
            ModelCatalogServiceError::Internal => Self::Internal,
        }
    }
}

impl From<ModelServiceError> for AppError {
    fn from(error: ModelServiceError) -> Self {
        match error {
            ModelServiceError::Forbidden => Self::Forbidden,
            ModelServiceError::InvalidInput => Self::InvalidModel,
            ModelServiceError::AlreadyExists => Self::ModelAlreadyExists,
            ModelServiceError::BrandNotFound => Self::BrandNotFound,
            ModelServiceError::NotFound => Self::ModelNotFound,
            ModelServiceError::Internal => Self::Internal,
        }
    }
}

impl From<UserManagementServiceError> for AppError {
    fn from(error: UserManagementServiceError) -> Self {
        match error {
            UserManagementServiceError::Forbidden => Self::Forbidden,
            UserManagementServiceError::InvalidEmail => Self::InvalidEmail,
            UserManagementServiceError::InvalidPassword => Self::InvalidPassword,
            UserManagementServiceError::EmailAlreadyExists => Self::EmailAlreadyExists,
            UserManagementServiceError::InvalidInput => Self::InvalidManagedUser,
            UserManagementServiceError::InvalidBalanceAdjustment => Self::InvalidBalanceAdjustment,
            UserManagementServiceError::DeleteConflict => Self::ManagedUserDeleteConflict,
            UserManagementServiceError::NotFound => Self::ManagedUserNotFound,
            UserManagementServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantApplicationServiceError> for AppError {
    fn from(error: MerchantApplicationServiceError) -> Self {
        match error {
            MerchantApplicationServiceError::Forbidden => Self::Forbidden,
            MerchantApplicationServiceError::InvalidInput => Self::InvalidMerchantApplication,
            MerchantApplicationServiceError::AlreadyExists => {
                Self::MerchantApplicationAlreadyExists
            }
            MerchantApplicationServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantManagementServiceError> for AppError {
    fn from(error: MerchantManagementServiceError) -> Self {
        match error {
            MerchantManagementServiceError::Forbidden => Self::Forbidden,
            MerchantManagementServiceError::InvalidInput => Self::InvalidManagedMerchant,
            MerchantManagementServiceError::EmailAlreadyExists => Self::EmailAlreadyExists,
            MerchantManagementServiceError::NotFound => Self::ManagedMerchantNotFound,
            MerchantManagementServiceError::InvalidState => Self::MerchantReviewConflict,
            MerchantManagementServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantChannelServiceError> for AppError {
    fn from(error: MerchantChannelServiceError) -> Self {
        match error {
            MerchantChannelServiceError::Forbidden => Self::Forbidden,
            MerchantChannelServiceError::InvalidInput => Self::InvalidMerchantChannel,
            MerchantChannelServiceError::NameAlreadyExists => {
                Self::MerchantChannelNameAlreadyExists
            }
            MerchantChannelServiceError::NotFound => Self::MerchantChannelNotFound,
            MerchantChannelServiceError::PendingReview => Self::MerchantChannelPendingReview,
            MerchantChannelServiceError::ReviewFieldsLocked => {
                Self::MerchantChannelReviewFieldsLocked
            }
            MerchantChannelServiceError::ConnectionFailed => Self::MerchantChannelConnectionFailed,
            MerchantChannelServiceError::CredentialsRejected => {
                Self::MerchantChannelCredentialsRejected
            }
            MerchantChannelServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantModelServiceError> for AppError {
    fn from(error: MerchantModelServiceError) -> Self {
        match error {
            MerchantModelServiceError::Forbidden => Self::Forbidden,
            MerchantModelServiceError::InvalidInput => Self::InvalidMerchantModel,
            MerchantModelServiceError::AlreadyExists => Self::MerchantModelAlreadyExists,
            MerchantModelServiceError::ChannelNotFound => Self::MerchantChannelNotFound,
            MerchantModelServiceError::ChannelPendingReview => Self::MerchantChannelPendingReview,
            MerchantModelServiceError::ModelNotFound => Self::ModelNotFound,
            MerchantModelServiceError::ProviderMismatch => Self::MerchantModelProviderMismatch,
            MerchantModelServiceError::PriceSettingsChanged => {
                Self::MerchantModelPriceSettingsChanged
            }
            MerchantModelServiceError::NotFound => Self::MerchantModelNotFound,
            MerchantModelServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantRequestServiceError> for AppError {
    fn from(error: MerchantRequestServiceError) -> Self {
        match error {
            MerchantRequestServiceError::Forbidden => Self::Forbidden,
            MerchantRequestServiceError::InvalidInput => Self::InvalidMerchantRequest,
            MerchantRequestServiceError::Internal => Self::Internal,
        }
    }
}

impl From<MerchantProfileServiceError> for AppError {
    fn from(error: MerchantProfileServiceError) -> Self {
        match error {
            MerchantProfileServiceError::Forbidden => Self::Forbidden,
            MerchantProfileServiceError::InvalidInput => Self::InvalidMerchantProfile,
            MerchantProfileServiceError::SettlementAccountLimit => {
                Self::MerchantSettlementAccountLimit
            }
            MerchantProfileServiceError::SettlementAccountNotFound => {
                Self::MerchantSettlementAccountNotFound
            }
            MerchantProfileServiceError::SettlementOptionDisabled => {
                Self::MerchantSettlementOptionDisabled
            }
            MerchantProfileServiceError::Internal => Self::Internal,
        }
    }
}

impl From<SystemSettingsServiceError> for AppError {
    fn from(error: SystemSettingsServiceError) -> Self {
        match error {
            SystemSettingsServiceError::Forbidden => Self::Forbidden,
            SystemSettingsServiceError::InvalidInput => Self::InvalidSystemSettings,
            SystemSettingsServiceError::Internal => Self::Internal,
        }
    }
}

impl From<PriceSettingsServiceError> for AppError {
    fn from(error: PriceSettingsServiceError) -> Self {
        match error {
            PriceSettingsServiceError::Forbidden => Self::Forbidden,
            PriceSettingsServiceError::InvalidInput => Self::InvalidPriceSettings,
            PriceSettingsServiceError::Internal => Self::Internal,
        }
    }
}

impl From<CatalogReviewServiceError> for AppError {
    fn from(error: CatalogReviewServiceError) -> Self {
        match error {
            CatalogReviewServiceError::ConnectionFailed => Self::MerchantChannelConnectionFailed,
            CatalogReviewServiceError::CredentialsRejected => {
                Self::MerchantChannelCredentialsRejected
            }
            CatalogReviewServiceError::Forbidden => Self::Forbidden,
            CatalogReviewServiceError::InvalidInput => Self::InvalidCatalogReview,
            CatalogReviewServiceError::NotFound => Self::CatalogReviewNotFound,
            CatalogReviewServiceError::InvalidState => Self::CatalogReviewConflict,
            CatalogReviewServiceError::ModelTestFailed => Self::CatalogReviewModelTestFailed,
            CatalogReviewServiceError::Internal => Self::Internal,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::InvalidRequest => (StatusCode::BAD_REQUEST, ErrorCode::InvalidRequest),
            Self::InvalidEmail => (StatusCode::BAD_REQUEST, ErrorCode::InvalidEmail),
            Self::InvalidPassword => (StatusCode::BAD_REQUEST, ErrorCode::InvalidPassword),
            Self::EmailAlreadyExists => (StatusCode::CONFLICT, ErrorCode::EmailAlreadyExists),
            Self::InvalidCredentials => (StatusCode::UNAUTHORIZED, ErrorCode::InvalidCredentials),
            Self::Unauthenticated => (StatusCode::UNAUTHORIZED, ErrorCode::Unauthenticated),
            Self::Forbidden => (StatusCode::FORBIDDEN, ErrorCode::Forbidden),
            Self::RegistrationDisabled => (StatusCode::FORBIDDEN, ErrorCode::RegistrationDisabled),
            Self::InvalidApiKey => (StatusCode::BAD_REQUEST, ErrorCode::InvalidApiKey),
            Self::ApiKeyNameAlreadyExists => {
                (StatusCode::CONFLICT, ErrorCode::ApiKeyNameAlreadyExists)
            }
            Self::ApiKeyAlreadyExists => (StatusCode::CONFLICT, ErrorCode::ApiKeyAlreadyExists),
            Self::ApiKeyNotFound => (StatusCode::NOT_FOUND, ErrorCode::ApiKeyNotFound),
            Self::AppRouteNotFound => (StatusCode::NOT_FOUND, ErrorCode::AppRouteNotFound),
            Self::InvalidAppRouteRoles => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidAppRouteRoles)
            }
            Self::InvalidBrand => (StatusCode::BAD_REQUEST, ErrorCode::InvalidBrand),
            Self::BrandAlreadyExists => (StatusCode::CONFLICT, ErrorCode::BrandAlreadyExists),
            Self::BrandPresetNotFound => (StatusCode::BAD_REQUEST, ErrorCode::BrandPresetNotFound),
            Self::BrandNotFound => (StatusCode::NOT_FOUND, ErrorCode::BrandNotFound),
            Self::InvalidModelCatalogLookup => (
                StatusCode::BAD_REQUEST,
                ErrorCode::InvalidModelCatalogLookup,
            ),
            Self::ModelCatalogEntryNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::ModelCatalogEntryNotFound)
            }
            Self::InvalidModel => (StatusCode::BAD_REQUEST, ErrorCode::InvalidModel),
            Self::ModelAlreadyExists => (StatusCode::CONFLICT, ErrorCode::ModelAlreadyExists),
            Self::ModelNotFound => (StatusCode::NOT_FOUND, ErrorCode::ModelNotFound),
            Self::InvalidManagedUser => (StatusCode::BAD_REQUEST, ErrorCode::InvalidManagedUser),
            Self::ManagedUserNotFound => (StatusCode::NOT_FOUND, ErrorCode::ManagedUserNotFound),
            Self::InvalidBalanceAdjustment => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidBalanceAdjustment)
            }
            Self::ManagedUserDeleteConflict => {
                (StatusCode::CONFLICT, ErrorCode::ManagedUserDeleteConflict)
            }
            Self::InvalidMerchantApplication => (
                StatusCode::BAD_REQUEST,
                ErrorCode::InvalidMerchantApplication,
            ),
            Self::MerchantApplicationAlreadyExists => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantApplicationAlreadyExists,
            ),
            Self::InvalidManagedMerchant => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidManagedMerchant)
            }
            Self::ManagedMerchantNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::ManagedMerchantNotFound)
            }
            Self::MerchantReviewConflict => {
                (StatusCode::CONFLICT, ErrorCode::MerchantReviewConflict)
            }
            Self::InvalidMerchantChannel => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidMerchantChannel)
            }
            Self::MerchantChannelNameAlreadyExists => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantChannelNameAlreadyExists,
            ),
            Self::MerchantChannelNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::MerchantChannelNotFound)
            }
            Self::MerchantChannelPendingReview => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantChannelPendingReview,
            ),
            Self::MerchantChannelConnectionFailed => (
                StatusCode::BAD_GATEWAY,
                ErrorCode::MerchantChannelConnectionFailed,
            ),
            Self::MerchantChannelCredentialsRejected => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorCode::MerchantChannelCredentialsRejected,
            ),
            Self::MerchantChannelReviewFieldsLocked => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantChannelReviewFieldsLocked,
            ),
            Self::InvalidMerchantModel => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidMerchantModel)
            }
            Self::MerchantModelAlreadyExists => {
                (StatusCode::CONFLICT, ErrorCode::MerchantModelAlreadyExists)
            }
            Self::MerchantModelNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::MerchantModelNotFound)
            }
            Self::MerchantModelProviderMismatch => (
                StatusCode::BAD_REQUEST,
                ErrorCode::MerchantModelProviderMismatch,
            ),
            Self::MerchantModelPriceSettingsChanged => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantModelPriceSettingsChanged,
            ),
            Self::InvalidPriceSettings => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidPriceSettings)
            }
            Self::InvalidCatalogReview => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidCatalogReview)
            }
            Self::CatalogReviewNotFound => {
                (StatusCode::NOT_FOUND, ErrorCode::CatalogReviewNotFound)
            }
            Self::CatalogReviewConflict => (StatusCode::CONFLICT, ErrorCode::CatalogReviewConflict),
            Self::CatalogReviewModelTestFailed => (
                StatusCode::BAD_GATEWAY,
                ErrorCode::CatalogReviewModelTestFailed,
            ),
            Self::InvalidMerchantRequest => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidMerchantRequest)
            }
            Self::InvalidMerchantProfile => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidMerchantProfile)
            }
            Self::MerchantSettlementAccountLimit => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantSettlementAccountLimit,
            ),
            Self::MerchantSettlementAccountNotFound => (
                StatusCode::NOT_FOUND,
                ErrorCode::MerchantSettlementAccountNotFound,
            ),
            Self::MerchantSettlementOptionDisabled => (
                StatusCode::CONFLICT,
                ErrorCode::MerchantSettlementOptionDisabled,
            ),
            Self::InvalidSystemSettings => {
                (StatusCode::BAD_REQUEST, ErrorCode::InvalidSystemSettings)
            }
            Self::DependencyUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorCode::DependencyUnavailable,
            ),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, ErrorCode::Internal),
        };

        (
            status,
            Json(ErrorEnvelope {
                error: ErrorBody { code: code.value() },
            }),
        )
            .into_response()
    }
}

#[cfg(test)]
#[path = "../tests/unit/error.rs"]
mod tests;

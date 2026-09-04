use jiff::Timestamp;

use super::UserId;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestSortField {
    SubmittedAt,
    UpdatedAt,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestOrigin {
    Manual,
    ChannelReview,
    ModelReview,
    ChannelLifecycle,
    ModelLifecycle,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantOperationSource {
    Merchant,
    Admin,
    System,
}

impl MerchantOperationSource {
    pub const fn as_api_str(self) -> &'static str {
        match self {
            Self::Merchant => "merchant",
            Self::Admin => "admin",
            Self::System => "system",
        }
    }

    pub const fn as_database_str(self) -> &'static str {
        self.as_api_str()
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "merchant" => Some(Self::Merchant),
            "admin" => Some(Self::Admin),
            "system" => Some(Self::System),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantOperationAudit {
    pub operator_user_id: UserId,
    pub source: MerchantOperationSource,
    pub reason: String,
}

impl MerchantRequestOrigin {
    pub const fn as_api_str(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::ChannelReview => "channelReview",
            Self::ModelReview => "modelReview",
            Self::ChannelLifecycle => "channelLifecycle",
            Self::ModelLifecycle => "modelLifecycle",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "manual" => Some(Self::Manual),
            "channel_review" => Some(Self::ChannelReview),
            "model_review" => Some(Self::ModelReview),
            "channel_lifecycle" => Some(Self::ChannelLifecycle),
            "model_lifecycle" => Some(Self::ModelLifecycle),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestAction {
    Publish,
    PriceChange,
    Unpublish,
    Violation,
    Activate,
    Offline,
    Delete,
}

impl MerchantRequestAction {
    pub const fn as_api_str(self) -> &'static str {
        match self {
            Self::Publish => "publish",
            Self::PriceChange => "priceChange",
            Self::Unpublish => "unpublish",
            Self::Violation => "violation",
            Self::Activate => "activate",
            Self::Offline => "offline",
            Self::Delete => "delete",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "publish" => Some(Self::Publish),
            "price_change" => Some(Self::PriceChange),
            "unpublish" => Some(Self::Unpublish),
            "violation" => Some(Self::Violation),
            "activate" => Some(Self::Activate),
            "offline" => Some(Self::Offline),
            "delete" => Some(Self::Delete),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestType {
    ChannelAccess,
    ModelReview,
    QuotaAdjustment,
    ChannelOperation,
    ModelOperation,
}

impl MerchantRequestType {
    pub const fn as_database_str(self) -> &'static str {
        match self {
            Self::ChannelAccess => "channel_access",
            Self::ModelReview => "model_review",
            Self::QuotaAdjustment => "quota_adjustment",
            Self::ChannelOperation => "channel_operation",
            Self::ModelOperation => "model_operation",
        }
    }

    pub const fn as_api_str(self) -> &'static str {
        match self {
            Self::ChannelAccess => "channelAccess",
            Self::ModelReview => "modelReview",
            Self::QuotaAdjustment => "quotaAdjustment",
            Self::ChannelOperation => "channelOperation",
            Self::ModelOperation => "modelOperation",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "channel_access" => Some(Self::ChannelAccess),
            "model_review" => Some(Self::ModelReview),
            "quota_adjustment" => Some(Self::QuotaAdjustment),
            "channel_operation" => Some(Self::ChannelOperation),
            "model_operation" => Some(Self::ModelOperation),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestStatus {
    Pending,
    ChangesRequested,
    Approved,
    Completed,
    Cancelled,
}

impl MerchantRequestStatus {
    pub const fn as_database_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::ChangesRequested => "changes_requested",
            Self::Approved => "approved",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub const fn as_api_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::ChangesRequested => "changesRequested",
            Self::Approved => "approved",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "pending" => Some(Self::Pending),
            "changes_requested" => Some(Self::ChangesRequested),
            "approved" => Some(Self::Approved),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantRequest {
    pub id: String,
    pub resource_id: String,
    pub origin: MerchantRequestOrigin,
    pub action: Option<MerchantRequestAction>,
    pub request_type: MerchantRequestType,
    pub subject: String,
    pub description: String,
    pub status: MerchantRequestStatus,
    pub review_note: String,
    pub operator_user_id: Option<UserId>,
    pub operator_source: MerchantOperationSource,
    pub operation_reason: String,
    pub submitted_at: Timestamp,
    pub updated_at: Timestamp,
}

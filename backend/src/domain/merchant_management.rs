use jiff::Timestamp;

use super::UserId;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantAccessStatus {
    Active,
    Disabled,
}

impl MerchantAccessStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Disabled => "disabled",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "active" => Some(Self::Active),
            "disabled" => Some(Self::Disabled),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ManagedMerchantStatus {
    Active,
    Pending,
    Rejected,
    Suspended,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantReviewDecision {
    Approve,
    Reject,
}

impl MerchantReviewDecision {
    pub const fn application_status(self) -> &'static str {
        match self {
            Self::Approve => "approved",
            Self::Reject => "rejected",
        }
    }
}

impl ManagedMerchantStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Pending => "pending",
            Self::Rejected => "rejected",
            Self::Suspended => "suspended",
        }
    }
}

#[derive(Debug)]
pub struct ManagedMerchant {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub status: ManagedMerchantStatus,
    pub channel_count: Option<u64>,
    pub model_count: Option<u64>,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
    pub created_at: Timestamp,
    pub application: Option<ManagedMerchantApplication>,
}

#[derive(Debug)]
pub struct ManagedMerchantApplication {
    pub application_code: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
    pub submitted_at: Timestamp,
    pub updated_at: Timestamp,
}

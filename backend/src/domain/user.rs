use jiff::Timestamp;

use super::pagination::Page;

pub type UserId = i64;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AccountRole {
    Personal,
    Merchant,
    Admin,
}

impl AccountRole {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Personal => "personal",
            Self::Merchant => "merchant",
            Self::Admin => "admin",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "personal" => Some(Self::Personal),
            "merchant" => Some(Self::Merchant),
            "admin" => Some(Self::Admin),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AccountStatus {
    Active,
    Disabled,
}

impl AccountStatus {
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

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: String,
    pub role: AccountRole,
    pub status: AccountStatus,
}

#[derive(Debug, Clone)]
pub struct ManagedUser {
    pub id: UserId,
    pub email: String,
    pub username: String,
    pub notes: String,
    pub role: AccountRole,
    pub status: AccountStatus,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
    pub last_login_at: Option<Timestamp>,
    pub last_login_ip: Option<String>,
    pub last_active_at: Option<Timestamp>,
    pub last_used_at: Option<Timestamp>,
    pub created_at: Timestamp,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ManagedUserBalanceAdjustmentKind {
    Deposit,
    Refund,
}

impl ManagedUserBalanceAdjustmentKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Deposit => "deposit",
            Self::Refund => "refund",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "deposit" => Some(Self::Deposit),
            "refund" => Some(Self::Refund),
            _ => None,
        }
    }

    pub(crate) const fn delta(self, amount_microusd: i64) -> i64 {
        match self {
            Self::Deposit => amount_microusd,
            Self::Refund => -amount_microusd,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ManagedUserBalanceAdjustment {
    pub id: i64,
    pub user_id: UserId,
    pub operator_user_id: UserId,
    pub adjustment_type: ManagedUserBalanceAdjustmentKind,
    pub amount_microusd: i64,
    pub balance_after_microusd: i64,
    pub notes: String,
    pub created_at: Timestamp,
}

#[derive(Debug)]
pub struct ManagedUserBalanceAdjustmentPage {
    pub page: Page<ManagedUserBalanceAdjustment>,
    pub total_deposited_microusd: i64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ManagedUserSortField {
    Balance,
    LastActive,
    LastUsed,
    Created,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ManagedUserSort {
    pub field: ManagedUserSortField,
    pub direction: SortDirection,
}

impl Default for ManagedUserSort {
    fn default() -> Self {
        Self {
            field: ManagedUserSortField::Created,
            direction: SortDirection::Desc,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/user.rs"]
mod tests;

use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        AccountRole, AccountStatus, ManagedUser, ManagedUserBalanceAdjustment,
        ManagedUserBalanceAdjustmentKind, ManagedUserSort, ManagedUserSortField, SortDirection,
    },
    dto::{PaginationQuery, PaginationResponse},
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListManagedUsersQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub role: Option<AccountRoleValue>,
    #[serde(default)]
    pub status: Option<AccountStatusValue>,
    #[serde(default)]
    pub sort_by: ManagedUserSortFieldValue,
    #[serde(default)]
    pub sort_order: SortDirectionValue,
}

impl ListManagedUsersQuery {
    pub fn sort(&self) -> ManagedUserSort {
        ManagedUserSort {
            field: self.sort_by.into(),
            direction: self.sort_order.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListManagedUserBalanceAdjustmentsQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub adjustment_type: Option<ManagedUserBalanceAdjustmentTypeValue>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ManagedUserBalanceAdjustmentTypeValue {
    Deposit,
    Refund,
}

impl From<ManagedUserBalanceAdjustmentTypeValue> for ManagedUserBalanceAdjustmentKind {
    fn from(value: ManagedUserBalanceAdjustmentTypeValue) -> Self {
        match value {
            ManagedUserBalanceAdjustmentTypeValue::Deposit => Self::Deposit,
            ManagedUserBalanceAdjustmentTypeValue::Refund => Self::Refund,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ManagedUserSortFieldValue {
    #[serde(rename = "balanceMicrousd")]
    Balance,
    #[serde(rename = "lastActiveAt")]
    LastActive,
    #[serde(rename = "lastUsedAt")]
    LastUsed,
    #[default]
    #[serde(rename = "createdAt")]
    Created,
}

impl From<ManagedUserSortFieldValue> for ManagedUserSortField {
    fn from(field: ManagedUserSortFieldValue) -> Self {
        match field {
            ManagedUserSortFieldValue::Balance => Self::Balance,
            ManagedUserSortFieldValue::LastActive => Self::LastActive,
            ManagedUserSortFieldValue::LastUsed => Self::LastUsed,
            ManagedUserSortFieldValue::Created => Self::Created,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortDirectionValue {
    Asc,
    #[default]
    Desc,
}

impl From<SortDirectionValue> for SortDirection {
    fn from(direction: SortDirectionValue) -> Self {
        match direction {
            SortDirectionValue::Asc => Self::Asc,
            SortDirectionValue::Desc => Self::Desc,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AccountRoleValue {
    Personal,
    Merchant,
    Admin,
}

impl From<AccountRoleValue> for AccountRole {
    fn from(role: AccountRoleValue) -> Self {
        match role {
            AccountRoleValue::Personal => Self::Personal,
            AccountRoleValue::Merchant => Self::Merchant,
            AccountRoleValue::Admin => Self::Admin,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AccountStatusValue {
    Active,
    Disabled,
}

impl From<AccountStatusValue> for AccountStatus {
    fn from(status: AccountStatusValue) -> Self {
        match status {
            AccountStatusValue::Active => Self::Active,
            AccountStatusValue::Disabled => Self::Disabled,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManagedUserRequest {
    pub email: String,
    #[serde(default)]
    pub password: Option<String>,
    pub username: String,
    pub notes: String,
    pub role: AccountRoleValue,
    pub status: AccountStatusValue,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateManagedUserRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub username: Option<String>,
    pub role: AccountRoleValue,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustManagedUserBalanceRequest {
    pub amount_microusd: i64,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteManagedUsersRequest {
    pub user_ids: Vec<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteManagedUsersResponse {
    pub deleted_count: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedUserResponse {
    pub id: i64,
    pub email: String,
    pub username: String,
    pub notes: String,
    pub role: &'static str,
    pub status: &'static str,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
    pub last_login_at: Option<Timestamp>,
    pub last_login_ip: Option<String>,
    pub last_active_at: Option<Timestamp>,
    pub last_used_at: Option<Timestamp>,
    pub created_at: Timestamp,
}

impl From<ManagedUser> for ManagedUserResponse {
    fn from(user: ManagedUser) -> Self {
        Self {
            id: user.id,
            email: user.email,
            username: user.username,
            notes: user.notes,
            role: user.role.as_str(),
            status: user.status.as_str(),
            balance_microusd: user.balance_microusd,
            concurrency_limit: user.concurrency_limit,
            rpm_limit: user.rpm_limit,
            last_login_at: user.last_login_at,
            last_login_ip: user.last_login_ip,
            last_active_at: user.last_active_at,
            last_used_at: user.last_used_at,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedUserBalanceAdjustmentResponse {
    pub id: i64,
    pub user_id: i64,
    pub operator_user_id: i64,
    pub adjustment_type: &'static str,
    pub amount_microusd: i64,
    pub balance_after_microusd: i64,
    pub notes: String,
    pub created_at: Timestamp,
}

impl From<ManagedUserBalanceAdjustment> for ManagedUserBalanceAdjustmentResponse {
    fn from(adjustment: ManagedUserBalanceAdjustment) -> Self {
        Self {
            id: adjustment.id,
            user_id: adjustment.user_id,
            operator_user_id: adjustment.operator_user_id,
            adjustment_type: adjustment.adjustment_type.as_str(),
            amount_microusd: adjustment.amount_microusd,
            balance_after_microusd: adjustment.balance_after_microusd,
            notes: adjustment.notes,
            created_at: adjustment.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedUserBalanceAdjustmentListResponse {
    pub items: Vec<ManagedUserBalanceAdjustmentResponse>,
    pub pagination: PaginationResponse,
    pub total_deposited_microusd: i64,
}

#[cfg(test)]
#[path = "../../tests/unit/dto_user_management.rs"]
mod tests;

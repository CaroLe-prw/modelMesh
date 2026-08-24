use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        ManagedMerchant, ManagedMerchantApplication, ManagedMerchantStatus, MerchantAccessStatus,
        MerchantReviewDecision,
    },
    dto::PaginationQuery,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManagedMerchantRequest {
    pub name: String,
    pub email: String,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManagedMerchantStatusRequest {
    pub status: ManagedMerchantAccessStatusValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateManagedMerchantStatusRequest {
    pub user_ids: Vec<i64>,
    pub status: ManagedMerchantAccessStatusValue,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateManagedMerchantStatusResponse {
    pub updated_count: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteManagedMerchantsRequest {
    pub user_ids: Vec<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteManagedMerchantsResponse {
    pub deleted_count: u64,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ManagedMerchantAccessStatusValue {
    Active,
    Disabled,
}

impl From<ManagedMerchantAccessStatusValue> for MerchantAccessStatus {
    fn from(status: ManagedMerchantAccessStatusValue) -> Self {
        match status {
            ManagedMerchantAccessStatusValue::Active => Self::Active,
            ManagedMerchantAccessStatusValue::Disabled => Self::Disabled,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewManagedMerchantRequest {
    pub decision: MerchantReviewDecisionValue,
    pub review_note: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum MerchantReviewDecisionValue {
    Approved,
    Rejected,
}

impl From<MerchantReviewDecisionValue> for MerchantReviewDecision {
    fn from(decision: MerchantReviewDecisionValue) -> Self {
        match decision {
            MerchantReviewDecisionValue::Approved => Self::Approve,
            MerchantReviewDecisionValue::Rejected => Self::Reject,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListManagedMerchantsQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub status: Option<ManagedMerchantStatusValue>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ManagedMerchantStatusValue {
    Active,
    Pending,
    Rejected,
    Suspended,
}

impl From<ManagedMerchantStatusValue> for ManagedMerchantStatus {
    fn from(status: ManagedMerchantStatusValue) -> Self {
        match status {
            ManagedMerchantStatusValue::Active => Self::Active,
            ManagedMerchantStatusValue::Pending => Self::Pending,
            ManagedMerchantStatusValue::Rejected => Self::Rejected,
            ManagedMerchantStatusValue::Suspended => Self::Suspended,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedMerchantResponse {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub status: &'static str,
    pub channel_count: Option<u64>,
    pub model_count: Option<u64>,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
    pub created_at: Timestamp,
    pub application: Option<ManagedMerchantApplicationResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedMerchantApplicationResponse {
    pub application_code: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
    pub submitted_at: Timestamp,
    pub updated_at: Timestamp,
}

impl From<ManagedMerchant> for ManagedMerchantResponse {
    fn from(merchant: ManagedMerchant) -> Self {
        Self {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            status: merchant.status.as_str(),
            channel_count: merchant.channel_count,
            model_count: merchant.model_count,
            balance_microusd: merchant.balance_microusd,
            concurrency_limit: merchant.concurrency_limit,
            rpm_limit: merchant.rpm_limit,
            created_at: merchant.created_at,
            application: merchant
                .application
                .map(ManagedMerchantApplicationResponse::from),
        }
    }
}

impl From<ManagedMerchantApplication> for ManagedMerchantApplicationResponse {
    fn from(application: ManagedMerchantApplication) -> Self {
        Self {
            application_code: application.application_code,
            avatar_url: application.avatar_url,
            website: application.website,
            description: application.description,
            submitted_at: application.submitted_at,
            updated_at: application.updated_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_management.rs"]
mod tests;

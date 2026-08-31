use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        MerchantRequest, MerchantRequestSortField, MerchantRequestStatus, MerchantRequestType,
        SortDirection,
    },
    dto::PaginationQuery,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListMerchantRequestsQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub status: Option<MerchantRequestStatusValue>,
    #[serde(default)]
    pub sort_order: MerchantRequestSortDirectionValue,
    #[serde(default)]
    pub sort_by: MerchantRequestSortFieldValue,
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantRequestSortFieldValue {
    #[default]
    SubmittedAt,
    UpdatedAt,
}

impl From<MerchantRequestSortFieldValue> for MerchantRequestSortField {
    fn from(value: MerchantRequestSortFieldValue) -> Self {
        match value {
            MerchantRequestSortFieldValue::SubmittedAt => Self::SubmittedAt,
            MerchantRequestSortFieldValue::UpdatedAt => Self::UpdatedAt,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantRequestSortDirectionValue {
    Asc,
    #[default]
    Desc,
}

impl From<MerchantRequestSortDirectionValue> for SortDirection {
    fn from(value: MerchantRequestSortDirectionValue) -> Self {
        match value {
            MerchantRequestSortDirectionValue::Asc => Self::Asc,
            MerchantRequestSortDirectionValue::Desc => Self::Desc,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantRequestStatusValue {
    Pending,
    ChangesRequested,
    Approved,
    Completed,
    Cancelled,
}

impl From<MerchantRequestStatusValue> for MerchantRequestStatus {
    fn from(value: MerchantRequestStatusValue) -> Self {
        match value {
            MerchantRequestStatusValue::Pending => Self::Pending,
            MerchantRequestStatusValue::ChangesRequested => Self::ChangesRequested,
            MerchantRequestStatusValue::Approved => Self::Approved,
            MerchantRequestStatusValue::Completed => Self::Completed,
            MerchantRequestStatusValue::Cancelled => Self::Cancelled,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantRequestTypeValue {
    ChannelAccess,
    ModelReview,
    QuotaAdjustment,
}

impl From<MerchantRequestTypeValue> for MerchantRequestType {
    fn from(value: MerchantRequestTypeValue) -> Self {
        match value {
            MerchantRequestTypeValue::ChannelAccess => Self::ChannelAccess,
            MerchantRequestTypeValue::ModelReview => Self::ModelReview,
            MerchantRequestTypeValue::QuotaAdjustment => Self::QuotaAdjustment,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMerchantRequestRequest {
    pub request_type: MerchantRequestTypeValue,
    pub subject: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantRequestResponse {
    pub id: String,
    pub origin: &'static str,
    pub action: Option<&'static str>,
    pub request_type: &'static str,
    pub subject: String,
    pub description: String,
    pub status: &'static str,
    pub review_note: String,
    pub submitted_at: Timestamp,
    pub updated_at: Timestamp,
}

impl From<MerchantRequest> for MerchantRequestResponse {
    fn from(request: MerchantRequest) -> Self {
        Self {
            id: request.id,
            origin: request.origin.as_api_str(),
            action: request.action.map(|action| action.as_api_str()),
            request_type: request.request_type.as_api_str(),
            subject: request.subject,
            description: request.description,
            status: request.status.as_api_str(),
            review_note: request.review_note,
            submitted_at: request.submitted_at,
            updated_at: request.updated_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_request.rs"]
mod tests;

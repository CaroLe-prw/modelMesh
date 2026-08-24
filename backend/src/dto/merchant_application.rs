use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{
    AccountRole, MerchantAccessStatus, MerchantApplication, MerchantApplicationStatus,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitMerchantApplicationRequest {
    pub business_name: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantApplicationResponse {
    pub id: i64,
    pub application_code: String,
    pub business_name: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
    pub status: &'static str,
    pub merchant_access_status: Option<&'static str>,
    pub review_note: String,
    pub reviewed_at: Option<Timestamp>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl MerchantApplicationResponse {
    pub fn new(application: MerchantApplication, role: AccountRole) -> Self {
        let merchant_access_status = match application.status {
            MerchantApplicationStatus::Approved if role == AccountRole::Merchant => {
                Some(MerchantAccessStatus::Active.as_str())
            }
            MerchantApplicationStatus::Approved => Some(MerchantAccessStatus::Disabled.as_str()),
            MerchantApplicationStatus::Pending | MerchantApplicationStatus::Rejected => None,
        };

        Self {
            id: application.id,
            application_code: application.application_code,
            business_name: application.business_name,
            avatar_url: application.avatar_url,
            website: application.website,
            description: application.description,
            status: application.status.as_str(),
            merchant_access_status,
            review_note: application.review_note,
            reviewed_at: application.reviewed_at,
            created_at: application.created_at,
            updated_at: application.updated_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_application.rs"]
mod tests;

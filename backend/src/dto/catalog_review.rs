use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        CatalogReview, CatalogReviewConnectionTest, CatalogReviewDecision, CatalogReviewKind,
        CatalogReviewModelCheck, CatalogReviewModelTest, CatalogReviewStatus,
    },
    dto::PaginationQuery,
};

const PRICE_NANO_SCALE: f64 = 100_000_000.0;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCatalogReviewsQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    pub kind: CatalogReviewKindValue,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub status: Option<CatalogReviewStatusValue>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CatalogReviewKindValue {
    Channel,
    Model,
}

impl From<CatalogReviewKindValue> for CatalogReviewKind {
    fn from(kind: CatalogReviewKindValue) -> Self {
        match kind {
            CatalogReviewKindValue::Channel => Self::Channel,
            CatalogReviewKindValue::Model => Self::Model,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CatalogReviewStatusValue {
    Pending,
    Approved,
    Rejected,
}

impl From<CatalogReviewStatusValue> for CatalogReviewStatus {
    fn from(status: CatalogReviewStatusValue) -> Self {
        match status {
            CatalogReviewStatusValue::Pending => Self::Pending,
            CatalogReviewStatusValue::Approved => Self::Approved,
            CatalogReviewStatusValue::Rejected => Self::Rejected,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCatalogItemRequest {
    pub kind: CatalogReviewKindValue,
    pub decision: CatalogReviewDecisionValue,
    pub expected_status: CatalogReviewStatusValue,
    #[serde(default)]
    pub review_note: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogReviewConnectionTestResponse {
    pub latency_ms: u64,
    pub model_count: u64,
}

impl From<CatalogReviewConnectionTest> for CatalogReviewConnectionTestResponse {
    fn from(result: CatalogReviewConnectionTest) -> Self {
        Self {
            latency_ms: result.latency_ms,
            model_count: result.model_count,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogReviewModelCheckResponse {
    pub key: &'static str,
    pub status: &'static str,
}

impl From<CatalogReviewModelCheck> for CatalogReviewModelCheckResponse {
    fn from(check: CatalogReviewModelCheck) -> Self {
        Self {
            key: check.kind.as_str(),
            status: check.status.as_str(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogReviewModelTestResponse {
    pub attempts: u8,
    pub average_latency_ms: u64,
    pub checks: Vec<CatalogReviewModelCheckResponse>,
    pub claimed_model: String,
    pub identity_risk: &'static str,
    pub observed_models: Vec<String>,
    pub official_endpoint: bool,
    pub successful_attempts: u8,
    pub system_fingerprints: Vec<String>,
}

impl From<CatalogReviewModelTest> for CatalogReviewModelTestResponse {
    fn from(result: CatalogReviewModelTest) -> Self {
        Self {
            attempts: result.attempts,
            average_latency_ms: result.average_latency_ms,
            checks: result.checks.into_iter().map(Into::into).collect(),
            claimed_model: result.claimed_model,
            identity_risk: result.identity_risk.as_str(),
            observed_models: result.observed_models,
            official_endpoint: result.official_endpoint,
            successful_attempts: result.successful_attempts,
            system_fingerprints: result.system_fingerprints,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CatalogReviewDecisionValue {
    Approved,
    Rejected,
}

impl From<CatalogReviewDecisionValue> for CatalogReviewDecision {
    fn from(decision: CatalogReviewDecisionValue) -> Self {
        match decision {
            CatalogReviewDecisionValue::Approved => Self::Approve,
            CatalogReviewDecisionValue::Rejected => Self::Reject,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogReviewResponse {
    pub id: String,
    pub channel_id: i64,
    pub action: &'static str,
    pub kind: &'static str,
    pub name: String,
    pub merchant: String,
    pub provider_id: String,
    pub provider: String,
    pub model_identifier: Option<String>,
    pub context_window: Option<i64>,
    pub output_price: Option<f64>,
    pub current_output_price: Option<f64>,
    pub proposed_output_price: Option<f64>,
    pub price_effective_at: Option<Timestamp>,
    pub review_note: String,
    pub status: &'static str,
    pub submitted_at: Timestamp,
}

impl From<CatalogReview> for CatalogReviewResponse {
    fn from(review: CatalogReview) -> Self {
        Self {
            id: review.id,
            channel_id: review.channel_id,
            action: review.action.as_str(),
            kind: review.kind.as_str(),
            name: review.name,
            merchant: review.merchant,
            provider_id: review.provider_id,
            provider: review.provider,
            model_identifier: review.model_identifier,
            context_window: review.context_window,
            output_price: review
                .proposed_output_price_nano_per_million
                .or(review.current_output_price_nano_per_million)
                .map(|price| price as f64 / PRICE_NANO_SCALE),
            current_output_price: review
                .current_output_price_nano_per_million
                .map(|price| price as f64 / PRICE_NANO_SCALE),
            proposed_output_price: review
                .proposed_output_price_nano_per_million
                .map(|price| price as f64 / PRICE_NANO_SCALE),
            price_effective_at: review.price_effective_at,
            review_note: review.review_note,
            status: review.status.as_str(),
            submitted_at: review.submitted_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_catalog_review.rs"]
mod tests;

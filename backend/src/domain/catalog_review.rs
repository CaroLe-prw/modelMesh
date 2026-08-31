use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewKind {
    Channel,
    Model,
}

impl CatalogReviewKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Channel => "channel",
            Self::Model => "model",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewStatus {
    Pending,
    Approved,
    Rejected,
}

impl CatalogReviewStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewDecision {
    Approve,
    Reject,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewAction {
    PriceChange,
    Publish,
    Unpublish,
    Violation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CatalogReviewConnectionTest {
    pub latency_ms: u64,
    pub model_count: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewModelCheckKind {
    Inference,
    InputFidelity,
    OutputStructure,
    MultiTurnContext,
    ParameterCompliance,
    TokenAccounting,
    ContentIntegrity,
    Stability,
    RoutingConsistency,
}

impl CatalogReviewModelCheckKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Inference => "inference",
            Self::InputFidelity => "inputFidelity",
            Self::OutputStructure => "outputStructure",
            Self::MultiTurnContext => "multiTurnContext",
            Self::ParameterCompliance => "parameterCompliance",
            Self::TokenAccounting => "tokenAccounting",
            Self::ContentIntegrity => "contentIntegrity",
            Self::Stability => "stability",
            Self::RoutingConsistency => "routingConsistency",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewModelCheckStatus {
    Passed,
    Warning,
    Failed,
}

impl CatalogReviewModelCheckStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Passed => "passed",
            Self::Warning => "warning",
            Self::Failed => "failed",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CatalogReviewModelIdentityRisk {
    Low,
    Medium,
    High,
    Unverified,
}

impl CatalogReviewModelIdentityRisk {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Unverified => "unverified",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CatalogReviewModelCheck {
    pub kind: CatalogReviewModelCheckKind,
    pub status: CatalogReviewModelCheckStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CatalogReviewModelTest {
    pub attempts: u8,
    pub average_latency_ms: u64,
    pub checks: Vec<CatalogReviewModelCheck>,
    pub claimed_model: String,
    pub identity_risk: CatalogReviewModelIdentityRisk,
    pub observed_models: Vec<String>,
    pub official_endpoint: bool,
    pub successful_attempts: u8,
    pub system_fingerprints: Vec<String>,
}

impl CatalogReviewAction {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PriceChange => "priceChange",
            Self::Publish => "publish",
            Self::Unpublish => "unpublish",
            Self::Violation => "violation",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CatalogReview {
    pub id: String,
    pub channel_id: i64,
    pub action: CatalogReviewAction,
    pub kind: CatalogReviewKind,
    pub name: String,
    pub merchant: String,
    pub provider_id: String,
    pub provider: String,
    pub model_identifier: Option<String>,
    pub context_window: Option<i64>,
    pub current_output_price_nano_per_million: Option<i64>,
    pub proposed_output_price_nano_per_million: Option<i64>,
    pub price_effective_at: Option<Timestamp>,
    pub review_note: String,
    pub status: CatalogReviewStatus,
    pub submitted_at: Timestamp,
}

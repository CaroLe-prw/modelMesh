use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantChannelStatus {
    Active,
    Offline,
    Pending,
    Rejected,
}

impl MerchantChannelStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Offline => "offline",
            Self::Pending => "pending",
            Self::Rejected => "rejected",
        }
    }

    pub const fn is_approved(self) -> bool {
        matches!(self, Self::Active | Self::Offline)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantChannel {
    pub api_key_ciphertext: String,
    pub available_models: Vec<String>,
    pub base_url: String,
    pub description: String,
    pub id: String,
    pub public_id: i64,
    pub name: String,
    pub provider_id: String,
    pub provider: String,
    pub status: MerchantChannelStatus,
    pub supported_models: Vec<String>,
    pub review_note: String,
    pub model_count: u64,
    pub success_rate_basis_points: u32,
    pub average_latency_ms: u64,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

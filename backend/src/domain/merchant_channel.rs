use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantChannelStatus {
    Active,
    Degraded,
    Offline,
}

impl MerchantChannelStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Degraded => "degraded",
            Self::Offline => "offline",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantChannel {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub provider: String,
    pub status: MerchantChannelStatus,
    pub model_count: u64,
    pub success_rate_basis_points: u32,
    pub average_latency_ms: u64,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

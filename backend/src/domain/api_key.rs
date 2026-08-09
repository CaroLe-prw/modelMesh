use jiff::Timestamp;

pub type ApiKeyId = String;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApiKeyStatus {
    Active,
    Paused,
}

impl ApiKeyStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Paused => "paused",
        }
    }
}

#[derive(Debug)]
pub struct ApiKey {
    pub id: ApiKeyId,
    pub name: String,
    pub key_prefix: String,
    pub key_suffix: String,
    pub status: ApiKeyStatus,
    pub ip_restriction_enabled: bool,
    pub ip_whitelist: String,
    pub ip_blacklist: String,
    pub quota_limit_microusd: i64,
    pub rate_limit_enabled: bool,
    pub five_hour_limit_microusd: i64,
    pub daily_limit_microusd: i64,
    pub weekly_limit_microusd: i64,
    pub expires_at: Option<Timestamp>,
    pub last_used_at: Option<Timestamp>,
    pub last_used_ip: Option<String>,
    pub created_at: Timestamp,
}

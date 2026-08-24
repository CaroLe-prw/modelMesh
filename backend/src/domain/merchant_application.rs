use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantApplicationStatus {
    Pending,
    Approved,
    Rejected,
}

impl MerchantApplicationStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub struct MerchantApplication {
    pub id: i64,
    pub application_code: String,
    pub business_name: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
    pub status: MerchantApplicationStatus,
    pub review_note: String,
    pub reviewed_at: Option<Timestamp>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

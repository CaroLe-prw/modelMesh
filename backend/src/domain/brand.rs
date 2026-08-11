use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BrandStatus {
    Active,
    Hidden,
}

impl BrandStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Hidden => "hidden",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Brand {
    pub identifier: String,
    pub name: String,
    pub avatar_svg: Option<String>,
    pub avatar_url: Option<String>,
    pub model_count: u64,
    pub merchant_count: u64,
    pub sort_order: i32,
    pub status: BrandStatus,
    pub updated_at: Timestamp,
}

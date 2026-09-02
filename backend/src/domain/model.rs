use jiff::Timestamp;

use super::ModelPricing;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ModelBillingMode {
    #[default]
    Token,
    Request,
}

impl ModelBillingMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Token => "token",
            Self::Request => "request",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "token" => Some(Self::Token),
            "request" => Some(Self::Request),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ModelStatus {
    Published,
    Disabled,
}

impl ModelStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Published => "published",
            Self::Disabled => "disabled",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ManagedModel {
    pub id: i64,
    pub brand_identifier: String,
    pub identifier: String,
    pub name: String,
    pub catalog_source: Option<String>,
    pub context_window: i64,
    pub billing_mode: ModelBillingMode,
    pub input_price_nano_usd_per_million: i64,
    pub input_price_overridden: bool,
    pub cache_read_price_nano_usd_per_million: i64,
    pub cache_read_price_overridden: bool,
    pub cache_write_price_nano_usd_per_million: i64,
    pub cache_write_price_overridden: bool,
    pub output_price_nano_usd_per_million: i64,
    pub output_price_overridden: bool,
    pub default_pricing: ModelPricing,
    pub pricing_overrides: ModelPricing,
    pub merchant_count: u64,
    pub sort_order: i32,
    pub status: ModelStatus,
    pub updated_at: Timestamp,
}

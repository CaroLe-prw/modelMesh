use jiff::Timestamp;

use super::{MerchantChannelStatus, ModelBillingMode, ModelPricing, PriceCurrency, PriceSettings};

pub type MerchantPriceCurrency = PriceCurrency;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MerchantBillingMode {
    #[default]
    Token,
    Request,
}

impl MerchantBillingMode {
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
pub enum MerchantModelStatus {
    Offline,
    Published,
}

impl MerchantModelStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Offline => "offline",
            Self::Published => "published",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantModelReviewStatus {
    Pending,
    Approved,
    Rejected,
}

impl MerchantModelReviewStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantModelPendingPrice {
    pub billing_mode: MerchantBillingMode,
    pub price_currency: MerchantPriceCurrency,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing: ModelPricing,
    pub effective_at: Option<Timestamp>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantModel {
    pub id: String,
    pub channel_id: String,
    pub channel_name: String,
    pub channel_status: MerchantChannelStatus,
    pub provider_id: String,
    pub model_id: i64,
    pub model_identifier: String,
    pub model_name: String,
    pub context_window: i64,
    pub billing_mode: MerchantBillingMode,
    pub price_currency: MerchantPriceCurrency,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing: ModelPricing,
    pub status: MerchantModelStatus,
    pub review_status: MerchantModelReviewStatus,
    pub has_approved_price: bool,
    pub pending_price: Option<MerchantModelPendingPrice>,
    pub review_note: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantModelOption {
    pub id: i64,
    pub identifier: String,
    pub name: String,
    pub context_window: i64,
    pub default_billing_mode: ModelBillingMode,
    pub input_price_nano_per_million: i64,
    pub output_price_nano_per_million: i64,
    pub pricing: ModelPricing,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantModelOptions {
    pub models: Vec<MerchantModelOption>,
    pub price_settings: Vec<PriceSettings>,
}

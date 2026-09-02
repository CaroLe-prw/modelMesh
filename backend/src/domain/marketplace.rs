use jiff::Timestamp;

use super::{MerchantBillingMode, ModelBillingMode, ModelPricing};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketplaceCatalog {
    pub brands: Vec<MarketplaceBrand>,
    pub models: Vec<MarketplaceModel>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketplaceBrand {
    pub id: String,
    pub name: String,
    pub avatar_svg: Option<String>,
    pub avatar_url: Option<String>,
    pub merchant_count: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketplaceModel {
    pub id: i64,
    pub brand_id: String,
    pub identifier: String,
    pub name: String,
    pub billing_mode: ModelBillingMode,
    pub input_from_nano_usd_per_million: i64,
    pub output_from_nano_usd_per_million: i64,
    pub request_from_nano_usd: i64,
    pub merchant_count: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketplaceMerchant {
    pub id: String,
    pub channel_id: i64,
    pub name: String,
    pub description: String,
    pub billing_mode: MerchantBillingMode,
    pub input_price_nano_usd_per_million: i64,
    pub output_price_nano_usd_per_million: i64,
    pub request_price_nano_usd: i64,
    pub official_pricing_nano_usd: ModelPricing,
    pub merchant_pricing_nano_usd: ModelPricing,
    pub price_multiplier_basis_points: Option<u64>,
    pub success_rate_basis_points: u32,
    pub average_latency_ms: u64,
    pub health_updated_at: Timestamp,
    pub is_in_route: bool,
    pub is_pinned: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketplaceRouteState {
    pub is_in_route: bool,
    pub is_pinned: bool,
}

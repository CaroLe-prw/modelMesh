use jiff::Timestamp;

use super::{PriceCurrency, PriceExchangeRate};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceSettings {
    pub exchange_rate: PriceExchangeRate,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ModelPriceReviewSettings {
    pub approved_price_effective_delay_hours: i32,
    pub price_increase_review_threshold_bps: i64,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceConfiguration {
    pub rates: Vec<PriceSettings>,
    pub review: ModelPriceReviewSettings,
}

impl PriceSettings {
    pub const fn currency(&self) -> PriceCurrency {
        self.exchange_rate.currency()
    }
}

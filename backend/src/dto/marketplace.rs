use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{
    MarketplaceBrand, MarketplaceCatalog, MarketplaceMerchant, MarketplaceModel,
    MarketplaceRouteState, ModelPricing, PRICE_NANO_SCALE, PriceSettings,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceMerchantQuery {
    #[serde(default)]
    pub api_key_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMarketplaceRouteRequest {
    pub is_in_route: bool,
    pub is_pinned: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceCatalogResponse {
    pub brands: Vec<MarketplaceBrandResponse>,
    pub models: Vec<MarketplaceModelResponse>,
    pub display_currencies: Vec<MarketplaceDisplayCurrencyResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceDisplayCurrencyResponse {
    pub code: &'static str,
    pub exchange_rate: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceBrandResponse {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_svg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub merchant_count: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceModelResponse {
    pub id: i64,
    pub brand_id: String,
    pub identifier: String,
    pub name: String,
    pub billing_mode: &'static str,
    pub input_from: f64,
    pub output_from: f64,
    pub request_from: f64,
    pub merchant_count: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceMerchantResponse {
    pub id: String,
    pub channel_id: i64,
    pub name: String,
    pub description: String,
    pub billing_mode: &'static str,
    pub input_price: f64,
    pub output_price: f64,
    pub request_price: f64,
    pub pricing: MarketplacePricingComparisonResponse,
    pub price_multiplier: Option<f64>,
    pub success_rate: f64,
    pub latency_ms: u64,
    pub health_updated_at: Timestamp,
    pub is_in_route: bool,
    pub is_pinned: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplacePricingComparisonResponse {
    pub official: MarketplacePriceRowResponse,
    pub merchant: MarketplacePriceRowResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplacePriceRowResponse {
    pub request: Option<String>,
    pub input: Option<String>,
    pub output: Option<String>,
    pub cache_read: Option<String>,
    pub cache_write: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceRouteStateResponse {
    pub is_in_route: bool,
    pub is_pinned: bool,
}

impl From<(MarketplaceCatalog, Vec<PriceSettings>)> for MarketplaceCatalogResponse {
    fn from((catalog, display_currencies): (MarketplaceCatalog, Vec<PriceSettings>)) -> Self {
        Self {
            brands: catalog
                .brands
                .into_iter()
                .map(MarketplaceBrandResponse::from)
                .collect(),
            models: catalog
                .models
                .into_iter()
                .map(MarketplaceModelResponse::from)
                .collect(),
            display_currencies: display_currencies
                .into_iter()
                .map(MarketplaceDisplayCurrencyResponse::from)
                .collect(),
        }
    }
}

impl From<PriceSettings> for MarketplaceDisplayCurrencyResponse {
    fn from(settings: PriceSettings) -> Self {
        Self {
            code: settings.currency().as_str(),
            exchange_rate: decimal_from_nano(settings.exchange_rate.nano_units_per_usd()),
        }
    }
}

impl From<MarketplaceBrand> for MarketplaceBrandResponse {
    fn from(brand: MarketplaceBrand) -> Self {
        Self {
            id: brand.id,
            name: brand.name,
            avatar_svg: brand.avatar_svg,
            avatar_url: brand.avatar_url,
            merchant_count: brand.merchant_count,
        }
    }
}

impl From<MarketplaceModel> for MarketplaceModelResponse {
    fn from(model: MarketplaceModel) -> Self {
        Self {
            id: model.id,
            brand_id: model.brand_id,
            identifier: model.identifier,
            name: model.name,
            billing_mode: model.billing_mode.as_str(),
            input_from: price_from_nano(model.input_from_nano_usd_per_million),
            output_from: price_from_nano(model.output_from_nano_usd_per_million),
            request_from: price_from_nano(model.request_from_nano_usd),
            merchant_count: model.merchant_count,
        }
    }
}

impl From<MarketplaceMerchant> for MarketplaceMerchantResponse {
    fn from(merchant: MarketplaceMerchant) -> Self {
        Self {
            id: merchant.id,
            channel_id: merchant.channel_id,
            name: merchant.name,
            description: merchant.description,
            billing_mode: merchant.billing_mode.as_str(),
            input_price: price_from_nano(merchant.input_price_nano_usd_per_million),
            output_price: price_from_nano(merchant.output_price_nano_usd_per_million),
            request_price: price_from_nano(merchant.request_price_nano_usd),
            pricing: MarketplacePricingComparisonResponse {
                official: MarketplacePriceRowResponse::from(&merchant.official_pricing_nano_usd),
                merchant: MarketplacePriceRowResponse::from(&merchant.merchant_pricing_nano_usd),
            },
            price_multiplier: merchant
                .price_multiplier_basis_points
                .map(|value| value as f64 / 10_000.0),
            success_rate: f64::from(merchant.success_rate_basis_points) / 100.0,
            latency_ms: merchant.average_latency_ms,
            health_updated_at: merchant.health_updated_at,
            is_in_route: merchant.is_in_route,
            is_pinned: merchant.is_pinned,
        }
    }
}

impl From<&ModelPricing> for MarketplacePriceRowResponse {
    fn from(pricing: &ModelPricing) -> Self {
        Self {
            request: pricing.base.get("request").copied().map(decimal_from_nano),
            input: pricing.base.get("input").copied().map(decimal_from_nano),
            output: pricing.base.get("output").copied().map(decimal_from_nano),
            cache_read: pricing
                .base
                .get("cache_read")
                .copied()
                .map(decimal_from_nano),
            cache_write: pricing
                .base
                .get("cache_write")
                .copied()
                .map(decimal_from_nano),
        }
    }
}

impl From<MarketplaceRouteState> for MarketplaceRouteStateResponse {
    fn from(state: MarketplaceRouteState) -> Self {
        Self {
            is_in_route: state.is_in_route,
            is_pinned: state.is_pinned,
        }
    }
}

fn price_from_nano(value: i64) -> f64 {
    value as f64 / PRICE_NANO_SCALE as f64
}

fn decimal_from_nano(value: i64) -> String {
    let whole = value / PRICE_NANO_SCALE;
    let fraction = value % PRICE_NANO_SCALE;
    if fraction == 0 {
        return whole.to_string();
    }
    let fraction = format!("{fraction:08}");
    format!("{whole}.{}", fraction.trim_end_matches('0'))
}

#[cfg(test)]
#[path = "../../tests/unit/dto_marketplace.rs"]
mod tests;

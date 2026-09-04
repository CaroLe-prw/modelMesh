use jiff::Timestamp;

use crate::domain::{
    MarketplaceBrand, MarketplaceCatalog, MarketplaceMerchant, MarketplaceRouteState,
    MerchantBillingMode, ModelPriceTier, ModelPricing, PriceCurrency, PriceExchangeRate,
    PriceSettings,
};

use super::{
    MarketplaceBrandResponse, MarketplaceCatalogResponse, MarketplaceMerchantResponse,
    MarketplaceRouteStateResponse,
};

#[test]
fn marketplace_brand_exposes_the_preset_svg_logo() {
    let value = serde_json::to_value(MarketplaceBrandResponse::from(MarketplaceBrand {
        id: "openai".to_owned(),
        name: "OpenAI".to_owned(),
        avatar_svg: Some("<svg viewBox=\"0 0 24 24\"></svg>".to_owned()),
        avatar_url: None,
        merchant_count: 1,
    }))
    .expect("brand response should serialize");

    assert_eq!(value["avatarSvg"], "<svg viewBox=\"0 0 24 24\"></svg>");
    assert!(value.get("avatarUrl").is_none());
}

#[test]
fn marketplace_catalog_exposes_configured_display_currencies_with_exact_rates() {
    let timestamp = "2026-08-31T08:00:00Z"
        .parse::<Timestamp>()
        .expect("timestamp should be valid");
    let response = MarketplaceCatalogResponse::from((
        MarketplaceCatalog {
            brands: Vec::new(),
            models: Vec::new(),
        },
        vec![
            PriceSettings {
                exchange_rate: PriceExchangeRate::new(PriceCurrency::Usd, 100_000_000)
                    .expect("USD rate should be valid"),
                updated_at: timestamp,
            },
            PriceSettings {
                exchange_rate: PriceExchangeRate::new(PriceCurrency::Cny, 720_000_000)
                    .expect("CNY rate should be valid"),
                updated_at: timestamp,
            },
        ],
    ));
    let value = serde_json::to_value(response).expect("catalog response should serialize");

    assert_eq!(
        value["displayCurrencies"],
        serde_json::json!([
            {"code": "USD", "exchangeRate": "1"},
            {"code": "CNY", "exchangeRate": "7.2"}
        ])
    );
}

#[test]
fn marketplace_merchant_prices_and_health_metrics_are_serialized_for_the_api() {
    let response = MarketplaceMerchantResponse::from(MarketplaceMerchant {
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        channel_id: 17,
        name: "Atlas Route".to_owned(),
        description: "Low latency".to_owned(),
        billing_mode: MerchantBillingMode::Token,
        input_price_nano_usd_per_million: 1_300_000,
        output_price_nano_usd_per_million: 7_780_000,
        request_price_nano_usd: 0,
        official_pricing_nano_usd: ModelPricing {
            base: [
                ("input".to_owned(), 1_200_000),
                ("output".to_owned(), 6_000_000),
                ("cache_read".to_owned(), 300_000),
            ]
            .into(),
            tiers: vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("input".to_owned(), 2_400_000)].into(),
            }],
            experimental_modes: [("fast".to_owned(), [("output".to_owned(), 9_000_000)].into())]
                .into(),
            ..ModelPricing::default()
        },
        merchant_pricing_nano_usd: ModelPricing {
            base: [
                ("input".to_owned(), 1_300_000),
                ("output".to_owned(), 7_780_000),
                ("cache_read".to_owned(), 400_000),
            ]
            .into(),
            tiers: vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("input".to_owned(), 2_600_000)].into(),
            }],
            experimental_modes: [("fast".to_owned(), [("output".to_owned(), 9_500_000)].into())]
                .into(),
            ..ModelPricing::default()
        },
        price_multiplier_basis_points: Some(10_833),
        success_rate_basis_points: 9_996,
        average_latency_ms: 842,
        health_updated_at: "2026-08-31T08:00:00Z"
            .parse::<Timestamp>()
            .expect("timestamp should be valid"),
        is_in_route: true,
        is_pinned: false,
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["inputPrice"], 0.013);
    assert_eq!(value["outputPrice"], 0.0778);
    assert_eq!(value["pricing"]["official"]["base"]["input"], 0.012);
    assert_eq!(value["pricing"]["merchant"]["base"]["output"], 0.0778);
    assert_eq!(value["pricing"]["merchant"]["base"]["cache_read"], 0.004);
    assert_eq!(value["pricing"]["official"]["tiers"][0]["size"], 272_000);
    assert_eq!(
        value["pricing"]["merchant"]["tiers"][0]["rates"]["input"],
        0.026
    );
    assert_eq!(
        value["pricing"]["official"]["experimentalModes"]["fast"]["output"],
        0.09
    );
    assert_eq!(value["priceMultiplier"], 1.0833);
    assert_eq!(value["successRate"], 99.96);
    assert_eq!(value["latencyMs"], 842);
    assert_eq!(value["isInRoute"], true);
}

#[test]
fn pinned_route_state_is_returned_with_camel_case_fields() {
    let value = serde_json::to_value(MarketplaceRouteStateResponse::from(MarketplaceRouteState {
        is_in_route: true,
        is_pinned: true,
    }))
    .expect("route state should serialize");

    assert_eq!(
        value,
        serde_json::json!({"isInRoute": true, "isPinned": true})
    );
}

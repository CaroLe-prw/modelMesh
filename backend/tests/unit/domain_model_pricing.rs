use super::{
    ModelPriceTier, ModelPricing, PriceCurrency, PriceExchangeRate,
    price_increase_exceeds_basis_points, usd_per_million_to_nano,
};
use crate::domain::ModelBillingMode;

#[test]
fn billing_mode_keeps_only_rates_that_belong_to_that_contract() {
    let pricing = ModelPricing {
        base: [
            ("input".to_owned(), 100),
            ("output".to_owned(), 1_000),
            ("request".to_owned(), 2_000),
        ]
        .into(),
        context_over_200k: Some([("input".to_owned(), 200)].into()),
        ..Default::default()
    };

    let token = pricing.clone().for_billing_mode(ModelBillingMode::Token);
    let request = pricing.for_billing_mode(ModelBillingMode::Request);

    assert_eq!(token.base["input"], 100);
    assert!(!token.base.contains_key("request"));
    assert_eq!(request.base["request"], 2_000);
    assert!(!request.base.contains_key("input"));
    assert!(request.context_over_200k.is_none());
}

#[test]
fn price_review_threshold_checks_every_price_group_without_rounding() {
    let current = ModelPricing {
        base: [("input".to_owned(), 100), ("output".to_owned(), 1_000)].into(),
        service_tiers: [("priority".to_owned(), [("output".to_owned(), 2_000)].into())].into(),
        ..Default::default()
    };
    let at_threshold = ModelPricing {
        base: [("input".to_owned(), 110), ("output".to_owned(), 1_000)].into(),
        service_tiers: [("priority".to_owned(), [("output".to_owned(), 2_200)].into())].into(),
        ..Default::default()
    };
    let above_threshold = ModelPricing {
        service_tiers: [("priority".to_owned(), [("output".to_owned(), 2_201)].into())].into(),
        ..at_threshold.clone()
    };

    assert!(!price_increase_exceeds_basis_points(
        &current,
        &at_threshold,
        1_000
    ));
    assert!(price_increase_exceeds_basis_points(
        &current,
        &above_threshold,
        1_000
    ));
    assert!(!price_increase_exceeds_basis_points(
        &above_threshold,
        &current,
        0
    ));
}

#[test]
fn decimal_prices_are_scaled_without_floating_point() {
    assert_eq!(usd_per_million_to_nano("0.26666667"), Some(26_666_667));
    assert_eq!(usd_per_million_to_nano("1.25e1"), Some(1_250_000_000));
    assert_eq!(usd_per_million_to_nano("0.000000009"), Some(1));
    assert_eq!(usd_per_million_to_nano("-0.1"), None);
}

#[test]
fn administrator_exchange_rate_converts_prices_without_floating_point() {
    let rate = PriceExchangeRate::parse(PriceCurrency::Cny, "7.2")
        .expect("a positive CNY rate should be valid");

    assert_eq!(
        rate.currency_nano_to_usd(7_200_000_000),
        Some(1_000_000_000)
    );
    assert!(PriceExchangeRate::parse(PriceCurrency::Usd, "1").is_some());
    assert!(PriceExchangeRate::parse(PriceCurrency::Usd, "1.01").is_none());
    assert!(PriceExchangeRate::parse(PriceCurrency::Cny, "0").is_none());
}

#[test]
fn exchange_rate_converts_every_complete_pricing_group() {
    let rate = PriceExchangeRate::parse(PriceCurrency::Cny, "7.2")
        .expect("a positive CNY rate should be valid");
    let pricing = ModelPricing {
        base: [("input".to_owned(), 7_200_000_000)].into(),
        experimental_modes: [(
            "fast".to_owned(),
            [("output".to_owned(), 14_400_000_000)].into(),
        )]
        .into(),
        experimental_mode_tiers: [(
            "fast".to_owned(),
            vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("output".to_owned(), 21_600_000_000)].into(),
            }],
        )]
        .into(),
        ..Default::default()
    };

    let normalized = rate
        .pricing_currency_to_usd(pricing)
        .expect("pricing conversion should not overflow");

    assert_eq!(normalized.base["input"], 1_000_000_000);
    assert_eq!(
        normalized.experimental_modes["fast"]["output"],
        2_000_000_000
    );
    assert_eq!(
        normalized.experimental_mode_tiers["fast"][0].rates["output"],
        3_000_000_000
    );
}

#[test]
fn overrides_merge_by_price_group_identity() {
    let defaults = ModelPricing {
        base: [("input".to_owned(), 500_000_000)].into(),
        tiers: vec![ModelPriceTier {
            tier_type: "context".to_owned(),
            size: 272_000,
            rates: [("input".to_owned(), 1_000_000_000)].into(),
        }],
        ..Default::default()
    };
    let overrides = ModelPricing {
        tiers: vec![ModelPriceTier {
            tier_type: "context".to_owned(),
            size: 272_000,
            rates: [("output".to_owned(), 4_500_000_000)].into(),
        }],
        service_tiers: [(
            "priority".to_owned(),
            [("input".to_owned(), 1_000_000_000)].into(),
        )]
        .into(),
        experimental_mode_tiers: [(
            "fast".to_owned(),
            vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("input".to_owned(), 2_000_000_000)].into(),
            }],
        )]
        .into(),
        ..Default::default()
    };

    let merged = defaults.merged_with(&overrides);

    assert_eq!(merged.tiers[0].rates["input"], 1_000_000_000);
    assert_eq!(merged.tiers[0].rates["output"], 4_500_000_000);
    assert_eq!(merged.service_tiers["priority"]["input"], 1_000_000_000);
    assert_eq!(
        merged.experimental_mode_tiers["fast"][0].rates["input"],
        2_000_000_000
    );
}

#[test]
fn supported_merge_ignores_rates_and_modes_removed_by_the_admin() {
    let current = ModelPricing {
        base: [("input".to_owned(), 100), ("output".to_owned(), 1_000)].into(),
        experimental_modes: [(
            "fast".to_owned(),
            [("input".to_owned(), 200), ("output".to_owned(), 2_000)].into(),
        )]
        .into(),
        experimental_mode_tiers: [(
            "fast".to_owned(),
            vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("input".to_owned(), 400)].into(),
            }],
        )]
        .into(),
        ..Default::default()
    };
    let listing = ModelPricing {
        base: [("input".to_owned(), 150), ("reasoning".to_owned(), 900)].into(),
        experimental_modes: [
            (
                "fast".to_owned(),
                [
                    ("output".to_owned(), 2_500),
                    ("reasoning".to_owned(), 3_000),
                ]
                .into(),
            ),
            ("turbo".to_owned(), [("output".to_owned(), 4_000)].into()),
        ]
        .into(),
        experimental_mode_tiers: [
            (
                "fast".to_owned(),
                vec![ModelPriceTier {
                    tier_type: "context".to_owned(),
                    size: 272_000,
                    rates: [("input".to_owned(), 450), ("reasoning".to_owned(), 3_000)].into(),
                }],
            ),
            (
                "turbo".to_owned(),
                vec![ModelPriceTier {
                    tier_type: "context".to_owned(),
                    size: 272_000,
                    rates: [("input".to_owned(), 500)].into(),
                }],
            ),
        ]
        .into(),
        ..Default::default()
    };

    let merged = current.merged_with_supported(&listing);

    assert_eq!(merged.base["input"], 150);
    assert_eq!(merged.base["output"], 1_000);
    assert!(!merged.base.contains_key("reasoning"));
    assert_eq!(merged.experimental_modes["fast"]["output"], 2_500);
    assert!(!merged.experimental_modes["fast"].contains_key("reasoning"));
    assert!(!merged.experimental_modes.contains_key("turbo"));
    assert_eq!(
        merged.experimental_mode_tiers["fast"][0].rates["input"],
        450
    );
    assert!(
        !merged.experimental_mode_tiers["fast"][0]
            .rates
            .contains_key("reasoning")
    );
    assert!(!merged.experimental_mode_tiers.contains_key("turbo"));
}

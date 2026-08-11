use super::{ModelPriceTier, ModelPricing, usd_per_million_to_nano};

#[test]
fn decimal_prices_are_scaled_without_floating_point() {
    assert_eq!(usd_per_million_to_nano("0.26666667"), Some(26_666_667));
    assert_eq!(usd_per_million_to_nano("1.25e1"), Some(1_250_000_000));
    assert_eq!(usd_per_million_to_nano("0.000000009"), Some(1));
    assert_eq!(usd_per_million_to_nano("-0.1"), None);
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
        ..Default::default()
    };

    let merged = defaults.merged_with(&overrides);

    assert_eq!(merged.tiers[0].rates["input"], 1_000_000_000);
    assert_eq!(merged.tiers[0].rates["output"], 4_500_000_000);
    assert_eq!(merged.service_tiers["priority"]["input"], 1_000_000_000);
}

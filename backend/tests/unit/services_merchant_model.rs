use super::{
    MerchantModelServiceError, MerchantPriceConversionMode, map_write_error,
    parse_exchange_rate_snapshot, parse_price, pricing_shape_is_supported,
    request_pricing_is_complete, require_approved_channel, resolve_conversion_exchange_rate,
    resolve_price_mutation, resolve_runtime_status, validate_uuid,
};

#[test]
fn text_model_can_use_a_single_per_request_price() {
    let pricing = ModelPricing {
        base: [("request".to_owned(), 25_000_000)].into(),
        ..Default::default()
    };
    assert!(request_pricing_is_complete(&pricing));

    let mut mixed = pricing;
    mixed.base.insert("input".to_owned(), 1);
    assert!(!request_pricing_is_complete(&mixed));
}

#[test]
fn changing_merchant_billing_mode_always_requires_review() {
    let token_pricing = ModelPricing {
        base: [("input".to_owned(), 100), ("output".to_owned(), 1_000)].into(),
        ..Default::default()
    };
    let request_pricing = ModelPricing {
        base: [("request".to_owned(), 1)].into(),
        ..Default::default()
    };

    assert_eq!(
        resolve_price_mutation(
            true,
            MerchantBillingMode::Token,
            &token_pricing,
            MerchantBillingMode::Request,
            &request_pricing,
            10_000,
        ),
        MerchantModelPriceMutation::SubmitForReview
    );
}
use crate::domain::{
    MerchantBillingMode, MerchantChannelStatus, MerchantModelStatus, MerchantPriceCurrency,
    ModelPriceTier, ModelPricing, PriceCurrency, PriceExchangeRate,
};
use crate::repository::{MerchantModelPriceMutation, RepositoryConflict, RepositoryError};

#[test]
fn price_change_review_does_not_change_the_model_runtime_state() {
    let current = ModelPricing {
        base: [("input".to_owned(), 100), ("output".to_owned(), 1_000)].into(),
        ..Default::default()
    };
    let small_increase = ModelPricing {
        base: [("input".to_owned(), 105), ("output".to_owned(), 1_050)].into(),
        ..Default::default()
    };
    let reviewed_increase = ModelPricing {
        base: [("input".to_owned(), 111), ("output".to_owned(), 1_000)].into(),
        ..Default::default()
    };

    assert_eq!(
        resolve_price_mutation(
            true,
            MerchantBillingMode::Token,
            &current,
            MerchantBillingMode::Token,
            &small_increase,
            500,
        ),
        MerchantModelPriceMutation::ApplyImmediately
    );
    assert_eq!(
        resolve_price_mutation(
            true,
            MerchantBillingMode::Token,
            &current,
            MerchantBillingMode::Token,
            &reviewed_increase,
            500,
        ),
        MerchantModelPriceMutation::SubmitForReview
    );
    assert_eq!(
        resolve_price_mutation(
            false,
            MerchantBillingMode::Token,
            &current,
            MerchantBillingMode::Token,
            &reviewed_increase,
            0,
        ),
        MerchantModelPriceMutation::ReplaceInitialSubmission
    );
}

#[test]
fn listing_ids_require_a_uuid() {
    assert!(validate_uuid("00000000-0000-4000-8000-000000000001").is_ok());
    assert_eq!(
        validate_uuid("listing-one"),
        Err(MerchantModelServiceError::InvalidInput)
    );
}

#[test]
fn model_listings_require_an_approved_channel() {
    assert_eq!(
        require_approved_channel(MerchantChannelStatus::Active),
        Ok(())
    );
    assert_eq!(
        require_approved_channel(MerchantChannelStatus::Offline),
        Ok(())
    );
    assert_eq!(
        require_approved_channel(MerchantChannelStatus::Pending),
        Err(MerchantModelServiceError::ChannelPendingReview)
    );
    assert_eq!(
        require_approved_channel(MerchantChannelStatus::Rejected),
        Err(MerchantModelServiceError::ChannelPendingReview)
    );
}

#[test]
fn only_approved_models_can_change_between_published_and_offline() {
    assert_eq!(
        resolve_runtime_status(true, MerchantModelStatus::Offline),
        Ok(MerchantModelStatus::Offline)
    );
    assert_eq!(
        resolve_runtime_status(true, MerchantModelStatus::Published),
        Ok(MerchantModelStatus::Published)
    );
    assert_eq!(
        resolve_runtime_status(false, MerchantModelStatus::Published),
        Err(MerchantModelServiceError::InvalidInput)
    );
}

#[test]
fn listing_prices_are_parsed_without_floating_point_rounding() {
    assert_eq!(parse_price("1.23456789"), Ok(123_456_789));
    assert_eq!(
        parse_price("-0.01"),
        Err(MerchantModelServiceError::InvalidInput)
    );
}

#[test]
fn listing_price_currency_uses_stable_codes() {
    assert_eq!(
        MerchantPriceCurrency::parse("USD"),
        Some(MerchantPriceCurrency::Usd)
    );
    assert_eq!(
        MerchantPriceCurrency::parse("CNY"),
        Some(MerchantPriceCurrency::Cny)
    );
    assert_eq!(MerchantPriceCurrency::parse("RMB"), None);
    assert_eq!(MerchantPriceCurrency::Cny.as_str(), "CNY");
}

#[test]
fn submitted_exchange_rate_snapshot_is_parsed_without_floating_point_rounding() {
    let rate = parse_exchange_rate_snapshot("CNY", "7.23456789")
        .expect("supported currency and positive exchange rate should parse");

    assert_eq!(rate.currency(), MerchantPriceCurrency::Cny);
    assert_eq!(rate.nano_units_per_usd(), 723_456_789);
    assert_eq!(
        parse_exchange_rate_snapshot("RMB", "7.2"),
        Err(MerchantModelServiceError::InvalidInput)
    );
}

#[test]
fn merchant_can_choose_parity_or_the_configured_fixed_rate() {
    let configured_rate = PriceExchangeRate::parse(PriceCurrency::Cny, "7.2")
        .expect("configured exchange rate should be valid");

    assert_eq!(
        resolve_conversion_exchange_rate(
            &[configured_rate],
            "CNY",
            "1",
            MerchantPriceConversionMode::Parity,
        )
        .expect("parity conversion should be allowed")
        .nano_units_per_usd(),
        100_000_000
    );
    assert_eq!(
        resolve_conversion_exchange_rate(
            &[configured_rate],
            "CNY",
            "7.2",
            MerchantPriceConversionMode::FixedRate,
        ),
        Ok(configured_rate)
    );
    assert_eq!(
        resolve_conversion_exchange_rate(
            &[configured_rate],
            "CNY",
            "7.2",
            MerchantPriceConversionMode::Parity,
        ),
        Err(MerchantModelServiceError::PriceSettingsChanged)
    );
    assert_eq!(
        resolve_conversion_exchange_rate(
            &[configured_rate],
            "CNY",
            "1",
            MerchantPriceConversionMode::FixedRate,
        ),
        Err(MerchantModelServiceError::PriceSettingsChanged)
    );
}

#[test]
fn duplicate_channel_model_pair_has_a_stable_service_error() {
    assert_eq!(
        map_write_error(
            RepositoryError::Conflict(RepositoryConflict::MerchantModelListing),
            42,
            "create"
        ),
        MerchantModelServiceError::AlreadyExists
    );
}

#[test]
fn listing_pricing_accepts_admin_cache_and_fast_shapes_only() {
    let reference = ModelPricing {
        base: [
            ("cache_read".to_owned(), 10),
            ("input".to_owned(), 100),
            ("output".to_owned(), 1_000),
        ]
        .into(),
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
                rates: [("output".to_owned(), 3_000)].into(),
            }],
        )]
        .into(),
        ..Default::default()
    };
    let supported = ModelPricing {
        base: [("cache_read".to_owned(), 20), ("input".to_owned(), 120)].into(),
        experimental_modes: [("fast".to_owned(), [("output".to_owned(), 2_500)].into())].into(),
        experimental_mode_tiers: [(
            "fast".to_owned(),
            vec![ModelPriceTier {
                tier_type: "context".to_owned(),
                size: 272_000,
                rates: [("output".to_owned(), 3_500)].into(),
            }],
        )]
        .into(),
        ..Default::default()
    };
    let unsupported = ModelPricing {
        experimental_modes: [("turbo".to_owned(), [("output".to_owned(), 3_000)].into())].into(),
        ..Default::default()
    };

    assert!(pricing_shape_is_supported(&reference, &supported));
    assert!(!pricing_shape_is_supported(&reference, &unsupported));

    let complete = reference.clone();
    assert!(pricing_shape_is_supported(&reference, &complete));
}

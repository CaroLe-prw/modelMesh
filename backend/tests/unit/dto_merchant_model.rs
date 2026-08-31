use jiff::Timestamp;
use serde_json::json;

use super::{
    CreateMerchantModelRequest, MerchantModelOptionsResponse, MerchantModelResponse,
    UpdateMerchantModelStatusRequest,
};
use crate::domain::{
    MerchantModel, MerchantModelOption, MerchantModelOptions, MerchantModelReviewStatus,
    MerchantModelStatus, MerchantPriceCurrency, ModelPricing, PriceCurrency, PriceExchangeRate,
    PriceSettings,
};

#[test]
fn merchant_model_response_uses_public_camel_case_contract() {
    let timestamp = "2026-08-27T08:00:00Z"
        .parse::<Timestamp>()
        .expect("test timestamp should be valid");
    let response = MerchantModelResponse::from(MerchantModel {
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        channel_id: "00000000-0000-4000-8000-000000000002".to_owned(),
        channel_name: "Northstar".to_owned(),
        provider_id: "openai".to_owned(),
        model_id: 9,
        model_identifier: "gpt-test".to_owned(),
        model_name: "GPT Test".to_owned(),
        context_window: 200_000,
        price_currency: MerchantPriceCurrency::Cny,
        input_price_nano_per_million: 125_000_000,
        output_price_nano_per_million: 1_000_000_000,
        pricing: ModelPricing {
            base: [
                ("cache_read".to_owned(), 12_500_000),
                ("input".to_owned(), 125_000_000),
                ("output".to_owned(), 1_000_000_000),
            ]
            .into(),
            experimental_modes: [(
                "fast".to_owned(),
                [
                    ("input".to_owned(), 250_000_000),
                    ("output".to_owned(), 2_000_000_000),
                ]
                .into(),
            )]
            .into(),
            ..Default::default()
        },
        status: MerchantModelStatus::Offline,
        review_status: MerchantModelReviewStatus::Rejected,
        has_approved_price: true,
        pending_price: None,
        review_note: "model identity mismatch".to_owned(),
        created_at: timestamp,
        updated_at: timestamp,
    });

    assert_eq!(
        serde_json::to_value(response).expect("response should serialize"),
        json!({
            "id": "00000000-0000-4000-8000-000000000001",
            "channelId": "00000000-0000-4000-8000-000000000002",
            "channelName": "Northstar",
            "providerId": "openai",
            "modelId": 9,
            "modelIdentifier": "gpt-test",
            "modelName": "GPT Test",
            "contextWindow": 200000,
            "priceCurrency": "CNY",
            "inputPrice": 1.25,
            "outputPrice": 10.0,
            "pricing": {
                "base": {
                    "cache_read": 0.125,
                    "input": 1.25,
                    "output": 10.0
                },
                "experimentalModes": {
                    "fast": {
                        "input": 2.5,
                        "output": 20.0
                    }
                }
            },
            "status": "offline",
            "reviewStatus": "rejected",
            "hasApprovedPrice": true,
            "pendingPrice": null,
            "reviewNote": "model identity mismatch",
            "createdAt": "2026-08-27T08:00:00Z",
            "updatedAt": "2026-08-27T08:00:00Z"
        })
    );
}

#[test]
fn merchant_model_runtime_status_accepts_only_public_listing_states() {
    let request: UpdateMerchantModelStatusRequest =
        serde_json::from_value(json!({ "status": "offline" }))
            .expect("offline should be a supported runtime status");

    assert_eq!(
        MerchantModelStatus::from(request.status),
        MerchantModelStatus::Offline
    );
    assert!(
        serde_json::from_value::<UpdateMerchantModelStatusRequest>(json!({ "status": "review" }))
            .is_err()
    );
}

#[test]
fn merchant_model_option_exposes_complete_admin_pricing() {
    let timestamp = "2026-08-27T08:00:00Z"
        .parse::<Timestamp>()
        .expect("test timestamp should be valid");
    let response = MerchantModelOptionsResponse::from(MerchantModelOptions {
        models: vec![MerchantModelOption {
            id: 9,
            identifier: "gpt-test".to_owned(),
            name: "GPT Test".to_owned(),
            context_window: 200_000,
            input_price_nano_per_million: 125_000_000,
            output_price_nano_per_million: 1_000_000_000,
            pricing: ModelPricing {
                base: [
                    ("cache_read".to_owned(), 12_500_000),
                    ("input".to_owned(), 125_000_000),
                    ("output".to_owned(), 1_000_000_000),
                ]
                .into(),
                experimental_modes: [(
                    "fast".to_owned(),
                    [
                        ("input".to_owned(), 250_000_000),
                        ("output".to_owned(), 2_000_000_000),
                    ]
                    .into(),
                )]
                .into(),
                ..Default::default()
            },
        }],
        price_settings: vec![PriceSettings {
            exchange_rate: PriceExchangeRate::new(PriceCurrency::Cny, 720_000_000)
                .expect("test exchange rate should be valid"),
            updated_at: timestamp,
        }],
    });

    let value = serde_json::to_value(response).expect("option response should serialize");
    assert_eq!(
        value["models"][0]["pricing"]["base"]["cache_read"],
        json!(0.125)
    );
    assert_eq!(value["priceSettings"][0]["priceCurrency"], json!("CNY"));
    assert_eq!(value["priceSettings"][0]["exchangeRate"], json!(7.2));
    assert_eq!(
        value["models"][0]["pricing"]["experimentalModes"]["fast"]["output"],
        json!(20.0)
    );
}

#[test]
fn merchant_model_request_accepts_fast_price_overrides() {
    let request = serde_json::from_value::<CreateMerchantModelRequest>(json!({
        "channelId": "00000000-0000-4000-8000-000000000002",
        "conversionMode": "fixedRate",
        "exchangeRate": 7.2,
        "modelId": 9,
        "inputPrice": 1.25,
        "outputPrice": 10,
        "priceCurrency": "CNY",
        "priceOverrides": [
            {
                "group": { "type": "experimentalMode", "mode": "fast" },
                "rate": "output",
                "price": 20
            },
            {
                "group": {
                    "type": "experimentalModeTier",
                    "mode": "fast",
                    "tierType": "context",
                    "size": 272000
                },
                "rate": "output",
                "price": 30
            }
        ]
    }))
    .expect("merchant listing request should deserialize");

    assert_eq!(request.price_overrides.len(), 2);
}

#[test]
fn merchant_model_request_requires_the_price_settings_snapshot() {
    let request = serde_json::from_value::<CreateMerchantModelRequest>(json!({
        "channelId": "00000000-0000-4000-8000-000000000002",
        "conversionMode": "fixedRate",
        "exchangeRate": 7.2,
        "modelId": 9,
        "inputPrice": 1.25,
        "outputPrice": 10,
        "priceCurrency": "CNY"
    }))
    .expect("request with the displayed price settings should deserialize");

    assert_eq!(request.price_currency, "CNY");
    assert_eq!(request.exchange_rate.to_string(), "7.2");
}

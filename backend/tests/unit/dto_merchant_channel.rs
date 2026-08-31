use serde_json::json;

use crate::domain::{MerchantChannel, MerchantChannelStatus};

use super::{MerchantChannelResponse, MerchantChannelStatusValue, UpdateMerchantChannelRequest};

#[test]
fn merchant_channel_response_uses_the_public_camel_case_contract() {
    let response = MerchantChannelResponse::from(MerchantChannel {
        api_key_ciphertext: "v1.encrypted".to_owned(),
        available_models: vec![
            "gpt-5".to_owned(),
            "gpt-5-mini".to_owned(),
            "gpt-5-nano".to_owned(),
        ],
        base_url: "https://api.openai.com/v1".to_owned(),
        description: "Official direct connection".to_owned(),
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        public_id: 42,
        name: "Northstar Global".to_owned(),
        provider_id: "openai".to_owned(),
        provider: "OpenAI".to_owned(),
        status: MerchantChannelStatus::Active,
        supported_models: vec!["gpt-5".to_owned(), "gpt-5-mini".to_owned()],
        review_note: String::new(),
        model_count: 8,
        success_rate_basis_points: 9_996,
        average_latency_ms: 842,
        created_at: "2026-08-09T04:20:00Z"
            .parse()
            .expect("creation timestamp should be valid"),
        updated_at: "2026-08-09T04:26:00Z"
            .parse()
            .expect("update timestamp should be valid"),
    });
    let value = serde_json::to_value(response).expect("channel response should serialize");

    assert_eq!(
        value,
        json!({
            "apiKeyConfigured": true,
            "availableModels": ["gpt-5", "gpt-5-mini", "gpt-5-nano"],
            "baseUrl": "https://api.openai.com/v1",
            "channelId": 42,
            "description": "Official direct connection",
            "id": "00000000-0000-4000-8000-000000000001",
            "name": "Northstar Global",
            "providerId": "openai",
            "provider": "OpenAI",
            "status": "active",
            "supportedModels": ["gpt-5", "gpt-5-mini"],
            "reviewNote": "",
            "modelCount": 8,
            "successRate": 99.96,
            "latencyMs": 842,
            "createdAt": "2026-08-09T04:20:00Z",
            "updatedAt": "2026-08-09T04:26:00Z"
        })
    );
}

#[test]
fn merchant_channel_request_accepts_all_public_statuses() {
    for (value, expected) in [
        ("active", MerchantChannelStatus::Active),
        ("offline", MerchantChannelStatus::Offline),
    ] {
        let request: UpdateMerchantChannelRequest = serde_json::from_value(json!({
            "availableModels": ["gpt-5", "gpt-5-mini"],
            "baseUrl": "https://api.openai.com/v1",
            "description": "",
            "name": "Channel",
            "providerId": "openai",
            "status": value,
            "supportedModels": ["gpt-5"]
        }))
        .expect("channel request should deserialize");

        assert_eq!(MerchantChannelStatus::from(request.status), expected);
    }

    assert_eq!(
        MerchantChannelStatus::from(MerchantChannelStatusValue::Offline),
        MerchantChannelStatus::Offline
    );

    let legacy_request: UpdateMerchantChannelRequest = serde_json::from_value(json!({
        "baseUrl": "https://api.openai.com/v1",
        "description": "",
        "name": "Channel",
        "providerId": "openai",
        "status": "offline",
        "supportedModels": ["gpt-5"]
    }))
    .expect("legacy request without available models should deserialize");
    assert!(legacy_request.available_models.is_empty());

    assert!(
        serde_json::from_value::<UpdateMerchantChannelRequest>(json!({
            "availableModels": ["gpt-5"],
            "baseUrl": "https://api.openai.com/v1",
            "description": "",
            "name": "Channel",
            "providerId": "openai",
            "status": "degraded",
            "supportedModels": ["gpt-5"]
        }))
        .is_err()
    );
}

#[test]
fn merchant_channel_provider_response_is_minimal_and_camel_case() {
    use crate::domain::{Brand, BrandStatus};

    let response = super::MerchantChannelProviderResponse::from(Brand {
        identifier: "openai".to_owned(),
        name: "OpenAI".to_owned(),
        avatar_svg: None,
        avatar_url: None,
        model_count: 8,
        merchant_count: 3,
        sort_order: 10,
        status: BrandStatus::Active,
        updated_at: "2026-08-09T04:26:00Z"
            .parse()
            .expect("provider timestamp should be valid"),
    });

    assert_eq!(
        serde_json::to_value(response).expect("provider response should serialize"),
        json!({"id": "openai", "name": "OpenAI"})
    );
}

use serde_json::json;

use crate::domain::{MerchantChannel, MerchantChannelStatus};

use super::{MerchantChannelResponse, MerchantChannelStatusValue, UpdateMerchantChannelRequest};

#[test]
fn merchant_channel_response_uses_the_public_camel_case_contract() {
    let response = MerchantChannelResponse::from(MerchantChannel {
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        name: "Northstar Global".to_owned(),
        provider_id: "openai".to_owned(),
        provider: "OpenAI".to_owned(),
        status: MerchantChannelStatus::Active,
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
            "id": "00000000-0000-4000-8000-000000000001",
            "name": "Northstar Global",
            "providerId": "openai",
            "provider": "OpenAI",
            "status": "active",
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
            "name": "Channel",
            "providerId": "openai",
            "status": value
        }))
        .expect("channel request should deserialize");

        assert_eq!(MerchantChannelStatus::from(request.status), expected);
    }

    assert_eq!(
        MerchantChannelStatus::from(MerchantChannelStatusValue::Offline),
        MerchantChannelStatus::Offline
    );

    assert!(
        serde_json::from_value::<UpdateMerchantChannelRequest>(json!({
            "name": "Channel",
            "providerId": "openai",
            "status": "degraded"
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

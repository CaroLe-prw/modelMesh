use serde_json::json;

use crate::domain::{
    MerchantProfile, MerchantProfileBundle, MerchantSettlementAccount, MerchantSettlementCurrency,
    MerchantSettlementMethod, MerchantSettlementNetwork,
};

use super::{
    CreateMerchantSettlementAccountRequest, MerchantProfileResponse, MerchantSettlementMethodValue,
    MerchantSettlementNetworkValue,
};

#[test]
fn settlement_request_accepts_alipay_and_supported_networks() {
    let alipay: CreateMerchantSettlementAccountRequest = serde_json::from_value(json!({
        "entityName": "Zhang San",
        "method": "alipay",
        "currency": "CNY",
        "account": "+8613800000000"
    }))
    .expect("Alipay request should deserialize");
    assert!(matches!(
        alipay.method,
        MerchantSettlementMethodValue::Alipay
    ));
    assert!(alipay.network.is_none());

    let usdt: CreateMerchantSettlementAccountRequest = serde_json::from_value(json!({
        "entityName": "ModelMesh Labs",
        "method": "usdt",
        "currency": "USDT",
        "network": "POLYGON",
        "account": "0x1234567890abcdef1234567890abcdef12345678"
    }))
    .expect("USDT request should deserialize");
    assert!(matches!(
        usdt.network,
        Some(MerchantSettlementNetworkValue::Polygon)
    ));
}

#[test]
fn merchant_profile_response_uses_camel_case_and_masked_accounts() {
    let timestamp = "2026-08-31T02:00:03Z"
        .parse()
        .expect("timestamp should be valid");
    let response = MerchantProfileResponse::from(MerchantProfileBundle {
        profile: MerchantProfile {
            merchant_code: "MM-2026-000007".to_owned(),
            business_name: "ModelMesh Labs".to_owned(),
            website: "https://modelmesh.example".to_owned(),
            industry: "AI infrastructure".to_owned(),
            contact_name: "Carole".to_owned(),
            contact_email: "merchant@example.com".to_owned(),
            contact_phone: "+86 138 0000 0000".to_owned(),
            updated_at: timestamp,
        },
        settlement_accounts: vec![MerchantSettlementAccount {
            id: "00000000-0000-4000-8000-000000000001".to_owned(),
            entity_name: "ModelMesh Labs".to_owned(),
            method: MerchantSettlementMethod::Bank,
            currency: MerchantSettlementCurrency::Usd,
            network: None,
            account_masked: "•••• 4821".to_owned(),
            is_default: true,
            created_at: timestamp,
        }],
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["merchantCode"], json!("MM-2026-000007"));
    assert_eq!(
        value["settlementAccounts"][0]["accountMasked"],
        json!("•••• 4821")
    );
    assert!(
        value["settlementAccounts"][0]
            .get("accountCiphertext")
            .is_none()
    );

    let networked = MerchantSettlementAccount {
        id: "00000000-0000-4000-8000-000000000002".to_owned(),
        entity_name: "ModelMesh Labs".to_owned(),
        method: MerchantSettlementMethod::Usdt,
        currency: MerchantSettlementCurrency::Usdt,
        network: Some(MerchantSettlementNetwork::Bep20),
        account_masked: "0x12••••5678".to_owned(),
        is_default: false,
        created_at: timestamp,
    };
    let value = serde_json::to_value(super::MerchantSettlementAccountResponse::from(networked))
        .expect("networked account should serialize");
    assert_eq!(value["network"], json!("BEP20"));
}

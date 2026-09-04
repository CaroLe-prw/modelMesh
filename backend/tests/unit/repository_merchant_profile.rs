use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{MerchantSettlementCurrency, MerchantSettlementMethod, MerchantSettlementNetwork},
    entity::{merchant_profile, merchant_settlement_account, merchant_withdrawal},
};

use super::{
    calculate_withdrawal_fee, merchant_profile_from_model, merchant_settlement_account_from_model,
    merchant_withdrawal_from_model,
};

fn timestamp() -> OffsetDateTime {
    OffsetDateTime::from_unix_timestamp(1_788_140_000).expect("timestamp should be valid")
}

#[test]
fn profile_model_maps_public_fields() {
    let profile = merchant_profile_from_model(merchant_profile::Model {
        merchant_user_id: 7,
        merchant_code: "MM-2026-000007".to_owned(),
        business_name: "ModelMesh Labs".to_owned(),
        website: "https://modelmesh.example".to_owned(),
        industry: "AI infrastructure".to_owned(),
        contact_name: "Carole".to_owned(),
        contact_email: "merchant@example.com".to_owned(),
        contact_phone: "+86 138 0000 0000".to_owned(),
        created_at: timestamp(),
        updated_at: timestamp(),
    })
    .expect("profile should map");

    assert_eq!(profile.merchant_code, "MM-2026-000007");
    assert_eq!(profile.business_name, "ModelMesh Labs");
}

#[test]
fn settlement_model_exposes_only_masked_account() {
    let account = merchant_settlement_account_from_model(merchant_settlement_account::Model {
        id: Uuid::parse_str("00000000-0000-4000-8000-000000000001").expect("id should be valid"),
        merchant_user_id: 7,
        entity_name: "ModelMesh Labs".to_owned(),
        method: "usdt".to_owned(),
        currency: "USDT".to_owned(),
        network: Some("BEP20".to_owned()),
        account_ciphertext: "v1.secret.ciphertext".to_owned(),
        account_masked: "0x12••••5678".to_owned(),
        is_default: true,
        created_at: timestamp(),
        updated_at: timestamp(),
    })
    .expect("settlement account should map");

    assert_eq!(account.method, MerchantSettlementMethod::Usdt);
    assert_eq!(account.currency, MerchantSettlementCurrency::Usdt);
    assert_eq!(account.network, Some(MerchantSettlementNetwork::Bep20));
    assert_eq!(account.account_masked, "0x12••••5678");
}

#[test]
fn withdrawal_model_keeps_the_destination_snapshot_and_exact_amounts() {
    let withdrawal = merchant_withdrawal_from_model(merchant_withdrawal::Model {
        id: Uuid::parse_str("00000000-0000-4000-8000-000000000099").expect("id should be valid"),
        merchant_user_id: 7,
        settlement_account_id: None,
        entity_name: "ModelMesh Labs".to_owned(),
        method: "bank".to_owned(),
        currency: "USD".to_owned(),
        network: None,
        account_ciphertext: "v1.secret.ciphertext".to_owned(),
        account_encryption_context: "merchant-settlement:00000000-0000-4000-8000-000000000001"
            .to_owned(),
        account_masked: "•••• 4821".to_owned(),
        amount_microusd: 100_000_000,
        fee_microusd: 1_500_000,
        net_amount_microusd: 98_500_000,
        balance_after_microusd: 900_000_000,
        status: "processing".to_owned(),
        review_note: String::new(),
        reviewed_by: None,
        reviewed_at: None,
        created_at: timestamp(),
        updated_at: timestamp(),
    })
    .expect("withdrawal should map");

    assert!(withdrawal.id.starts_with("wd_"));
    assert_eq!(withdrawal.amount_microusd, 100_000_000);
    assert_eq!(withdrawal.account_masked, "•••• 4821");
    assert_eq!(calculate_withdrawal_fee(100_000_000, 150), Some(1_500_000));
}

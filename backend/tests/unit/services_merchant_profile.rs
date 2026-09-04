use crate::domain::{
    MerchantSettlementCurrency, MerchantSettlementMethod, MerchantSettlementNetwork,
};

use super::{
    CreateMerchantSettlementAccount, MerchantProfileServiceError, UpdateMerchantProfile,
    mask_settlement_account, parse_withdrawal_amount, validate_profile,
    validate_settlement_account,
};

#[test]
fn merchant_profile_is_trimmed_and_validated() {
    let profile = validate_profile(UpdateMerchantProfile {
        business_name: " ModelMesh Labs ".to_owned(),
        website: " https://modelmesh.example ".to_owned(),
        industry: " AI infrastructure ".to_owned(),
        contact_name: " Carole ".to_owned(),
        contact_email: " Merchant@Example.com ".to_owned(),
        contact_phone: " +86 138 0000 0000 ".to_owned(),
    })
    .expect("profile should be valid");

    assert_eq!(profile.business_name, "ModelMesh Labs");
    assert_eq!(profile.contact_email, "merchant@example.com");
    assert_eq!(profile.contact_phone, "+86 138 0000 0000");
}

#[test]
fn settlement_method_and_currency_must_match() {
    let request = CreateMerchantSettlementAccount {
        entity_name: "ModelMesh Labs".to_owned(),
        method: MerchantSettlementMethod::Bank,
        currency: MerchantSettlementCurrency::Usdt,
        network: None,
        account: "1234567890123456".to_owned(),
    };

    assert!(matches!(
        validate_settlement_account(&request),
        Err(MerchantProfileServiceError::InvalidInput)
    ));
}

#[test]
fn alipay_accounts_use_cny_without_a_network() {
    let request = CreateMerchantSettlementAccount {
        entity_name: " 张三 ".to_owned(),
        method: MerchantSettlementMethod::Alipay,
        currency: MerchantSettlementCurrency::Cny,
        network: None,
        account: " +86 138 0000 0000 ".to_owned(),
    };

    let (name, phone) =
        validate_settlement_account(&request).expect("Alipay account should be valid");
    assert_eq!(name, "张三");
    assert_eq!(phone, "+8613800000000");
}

#[test]
fn alipay_rejects_an_email_instead_of_a_phone_number() {
    let request = CreateMerchantSettlementAccount {
        entity_name: "Zhang San".to_owned(),
        method: MerchantSettlementMethod::Alipay,
        currency: MerchantSettlementCurrency::Cny,
        network: None,
        account: "merchant@example.com".to_owned(),
    };

    assert!(matches!(
        validate_settlement_account(&request),
        Err(MerchantProfileServiceError::InvalidInput)
    ));
}

#[test]
fn usdt_network_is_required_and_must_match_the_address_shape() {
    let missing_network = CreateMerchantSettlementAccount {
        entity_name: "ModelMesh Labs".to_owned(),
        method: MerchantSettlementMethod::Usdt,
        currency: MerchantSettlementCurrency::Usdt,
        network: None,
        account: "0x1234567890abcdef1234567890abcdef12345678".to_owned(),
    };
    assert!(matches!(
        validate_settlement_account(&missing_network),
        Err(MerchantProfileServiceError::InvalidInput)
    ));

    let erc20 = CreateMerchantSettlementAccount {
        network: Some(MerchantSettlementNetwork::Erc20),
        ..missing_network
    };
    assert!(validate_settlement_account(&erc20).is_ok());

    let wrong_network = CreateMerchantSettlementAccount {
        network: Some(MerchantSettlementNetwork::Trc20),
        ..erc20
    };
    assert!(matches!(
        validate_settlement_account(&wrong_network),
        Err(MerchantProfileServiceError::InvalidInput)
    ));
}

#[test]
fn settlement_accounts_are_masked_without_exposing_the_full_value() {
    assert_eq!(
        mask_settlement_account(MerchantSettlementMethod::Bank, "1234567890"),
        "•••• 7890"
    );
    assert_eq!(
        mask_settlement_account(MerchantSettlementMethod::Usdt, "TQ9f1234567K2p"),
        "TQ9f••••7K2p"
    );
    assert_eq!(
        mask_settlement_account(MerchantSettlementMethod::Alipay, "13800000000"),
        "138••••0000"
    );
}

#[test]
fn withdrawal_amounts_are_parsed_as_exact_microusd() {
    assert_eq!(parse_withdrawal_amount(" 1280.123456 "), Ok(1_280_123_456));
    assert_eq!(parse_withdrawal_amount("10"), Ok(10_000_000));
    for invalid in ["", "0", "-1", "+1", "1e3", "1.1234567", ".50"] {
        assert_eq!(
            parse_withdrawal_amount(invalid),
            Err(MerchantProfileServiceError::InvalidWithdrawal)
        );
    }
}

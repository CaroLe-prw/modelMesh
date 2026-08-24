use serde_json::json;

use crate::domain::{AccountRole, MerchantApplication, MerchantApplicationStatus};

use super::MerchantApplicationResponse;

fn approved_application() -> MerchantApplication {
    MerchantApplication {
        id: 2,
        application_code: "2026081711380938077".to_owned(),
        business_name: "test".to_owned(),
        avatar_url: None,
        website: Some("https://viap.cc".to_owned()),
        description: "A complete merchant application description".to_owned(),
        status: MerchantApplicationStatus::Approved,
        review_note: String::new(),
        reviewed_at: None,
        created_at: "2026-08-17T03:38:09Z"
            .parse()
            .expect("creation timestamp should be valid"),
        updated_at: "2026-08-17T03:38:09Z"
            .parse()
            .expect("update timestamp should be valid"),
    }
}

#[test]
fn approved_application_reports_disabled_merchant_access_for_a_personal_session() {
    let response = MerchantApplicationResponse::new(approved_application(), AccountRole::Personal);
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["status"], json!("approved"));
    assert_eq!(value["merchantAccessStatus"], json!("disabled"));
}

#[test]
fn approved_application_reports_active_merchant_access_for_a_merchant_session() {
    let response = MerchantApplicationResponse::new(approved_application(), AccountRole::Merchant);
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["merchantAccessStatus"], json!("active"));
}

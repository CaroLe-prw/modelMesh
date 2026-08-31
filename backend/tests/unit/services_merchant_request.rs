use crate::domain::{MerchantRequestStatus, MerchantRequestType};

use super::{CreateMerchantRequest, MerchantRequestServiceError, build_search, validate_request};

fn valid_request() -> CreateMerchantRequest {
    CreateMerchantRequest {
        request_type: MerchantRequestType::ChannelAccess,
        subject: " Add an APAC provider channel ".to_owned(),
        description: " We need a dedicated provider route for customers in the APAC region. "
            .to_owned(),
    }
}

#[test]
fn merchant_request_is_trimmed_and_validated() {
    let request = validate_request(valid_request()).expect("request should be valid");

    assert_eq!(request.subject, "Add an APAC provider channel");
    assert_eq!(
        request.description,
        "We need a dedicated provider route for customers in the APAC region."
    );
    assert_eq!(request.request_type, MerchantRequestType::ChannelAccess);
}

#[test]
fn merchant_request_rejects_a_short_subject() {
    let mut request = valid_request();
    request.subject = "ok".to_owned();

    assert!(matches!(
        validate_request(request),
        Err(MerchantRequestServiceError::InvalidInput)
    ));
}

#[test]
fn merchant_request_rejects_a_short_description() {
    let mut request = valid_request();
    request.description = "Too short".to_owned();

    assert!(matches!(
        validate_request(request),
        Err(MerchantRequestServiceError::InvalidInput)
    ));
}

#[test]
fn merchant_request_allows_multiline_descriptions() {
    let mut request = valid_request();
    request.description = "Current quota: 10,000\nRequested quota: 50,000".to_owned();

    assert!(validate_request(request).is_ok());
}

#[test]
fn merchant_log_search_recognizes_public_log_ids_and_escapes_patterns() {
    let search = build_search(
        Some(" log_17%_ ".to_owned()),
        Some(MerchantRequestStatus::Completed),
    )
    .expect("search should be valid");

    assert_eq!(search.exact_id, None);
    assert_eq!(search.pattern.as_deref(), Some("%log\\_17\\%\\_%"));
    assert_eq!(search.status, Some(MerchantRequestStatus::Completed));

    let exact = build_search(Some("log_17".to_owned()), None).expect("log id should be valid");
    assert_eq!(exact.exact_id, Some(17));
}

#[test]
fn merchant_log_search_rejects_control_characters() {
    assert!(matches!(
        build_search(Some("bad\nquery".to_owned()), None),
        Err(MerchantRequestServiceError::InvalidInput)
    ));
}

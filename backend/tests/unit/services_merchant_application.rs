use super::{MerchantApplicationServiceError, SubmitMerchantApplication, validate_application};

fn valid_application() -> SubmitMerchantApplication {
    SubmitMerchantApplication {
        business_name: " Northstar AI ".to_owned(),
        avatar_url: Some(" https://northstar.example/avatar.png ".to_owned()),
        website: Some(" https://northstar.example/about ".to_owned()),
        description: " We operate reliable model inference channels for developer teams. "
            .to_owned(),
    }
}

#[test]
fn merchant_application_is_trimmed_and_validated() {
    let validated = validate_application(valid_application()).expect("application should be valid");

    assert_eq!(validated.business_name, "Northstar AI");
    assert_eq!(
        validated.avatar_url.as_deref(),
        Some("https://northstar.example/avatar.png")
    );
    assert_eq!(
        validated.website.as_deref(),
        Some("https://northstar.example/about")
    );
    assert_eq!(
        validated.description,
        "We operate reliable model inference channels for developer teams."
    );
}

#[test]
fn merchant_application_accepts_a_base64_avatar() {
    let mut application = valid_application();
    application.avatar_url = Some("data:image/png;base64,aGVsbG8=".to_owned());

    let validated = validate_application(application).expect("application should be valid");

    assert_eq!(
        validated.avatar_url.as_deref(),
        Some("data:image/png;base64,aGVsbG8=")
    );
}

#[test]
fn merchant_application_rejects_unsupported_avatar_sources() {
    let mut application = valid_application();
    application.avatar_url = Some("data:image/svg+xml;base64,PHN2Zz4=".to_owned());

    assert!(matches!(
        validate_application(application),
        Err(MerchantApplicationServiceError::InvalidInput)
    ));
}

#[test]
fn merchant_application_requires_a_meaningful_description() {
    let mut application = valid_application();
    application.description = "Too short".to_owned();

    assert!(matches!(
        validate_application(application),
        Err(MerchantApplicationServiceError::InvalidInput)
    ));
}

#[test]
fn merchant_application_rejects_non_http_websites() {
    let mut application = valid_application();
    application.website = Some("northstar.example".to_owned());

    assert!(matches!(
        validate_application(application),
        Err(MerchantApplicationServiceError::InvalidInput)
    ));
}

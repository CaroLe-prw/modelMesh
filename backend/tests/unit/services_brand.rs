use crate::services::BrandServiceError;

use super::{
    build_search_pattern, normalize_identifier, normalize_name, validate_avatar_data_url,
    validate_sort_order,
};

#[test]
fn brand_identifier_is_normalized_and_validated() {
    assert_eq!(
        normalize_identifier("  Mistral-AI  ".to_owned()),
        Ok("mistral-ai".to_owned())
    );
    assert_eq!(
        normalize_identifier("mistral--ai".to_owned()),
        Err(BrandServiceError::InvalidInput)
    );
    assert_eq!(
        normalize_identifier("智谱".to_owned()),
        Err(BrandServiceError::InvalidInput)
    );
}

#[test]
fn brand_name_and_search_are_bounded() {
    assert_eq!(
        normalize_name("  Mistral AI  ".to_owned()),
        Ok("Mistral AI".to_owned())
    );
    assert_eq!(
        normalize_name("\n".to_owned()),
        Err(BrandServiceError::InvalidInput)
    );
    assert_eq!(
        build_search_pattern(Some("100%_AI".to_owned())),
        Ok(Some("%100\\%\\_AI%".to_owned()))
    );
}

#[test]
fn custom_avatar_requires_a_supported_base64_data_url() {
    assert_eq!(
        validate_avatar_data_url("data:image/png;base64,aGVsbG8=".to_owned()),
        Ok("data:image/png;base64,aGVsbG8=".to_owned())
    );
    assert_eq!(
        validate_avatar_data_url("data:image/svg+xml;base64,PHN2Zz4=".to_owned()),
        Err(BrandServiceError::InvalidInput)
    );
}

#[test]
fn brand_sort_order_cannot_be_negative() {
    assert_eq!(validate_sort_order(0), Ok(()));
    assert_eq!(
        validate_sort_order(-1),
        Err(BrandServiceError::InvalidInput)
    );
}

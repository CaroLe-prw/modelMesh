use uuid::Uuid;

use super::{MarketplaceServiceError, parse_uuid, validate_model_id};

#[test]
fn marketplace_identifiers_are_validated_at_the_service_boundary() {
    assert_eq!(validate_model_id(1), Ok(()));
    assert_eq!(
        validate_model_id(0),
        Err(MarketplaceServiceError::InvalidInput)
    );
    assert!(parse_uuid(Uuid::nil().hyphenated().to_string()).is_ok());
    assert_eq!(
        parse_uuid("not-a-uuid".to_owned()),
        Err(MarketplaceServiceError::InvalidInput)
    );
}

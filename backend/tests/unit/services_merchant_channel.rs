use crate::{
    repository::{RepositoryConflict, RepositoryError},
    services::MerchantChannelServiceError,
};

use super::{map_write_error, normalize_name, normalize_provider_id, validate_channel_id};

#[test]
fn channel_name_is_trimmed_and_bounded() {
    assert_eq!(
        normalize_name("  Northstar Global  ".to_owned()),
        Ok("Northstar Global".to_owned())
    );
    assert_eq!(
        normalize_name("\n".to_owned()),
        Err(MerchantChannelServiceError::InvalidInput)
    );
    assert_eq!(
        normalize_name("x".repeat(81)),
        Err(MerchantChannelServiceError::InvalidInput)
    );
}

#[test]
fn provider_id_uses_the_admin_brand_identifier_contract() {
    assert_eq!(
        normalize_provider_id(" OpenAI-Compatible ".to_owned()),
        Ok("openai-compatible".to_owned())
    );
    for invalid in ["", "open_ai", "open ai", "-openai", "openai-"] {
        assert_eq!(
            normalize_provider_id(invalid.to_owned()),
            Err(MerchantChannelServiceError::InvalidInput)
        );
    }
}

#[test]
fn channel_id_requires_a_uuid() {
    assert!(validate_channel_id("00000000-0000-4000-8000-000000000001").is_ok());
    assert_eq!(
        validate_channel_id("channel-one"),
        Err(MerchantChannelServiceError::InvalidInput)
    );
}

#[test]
fn duplicate_channel_name_has_a_stable_service_error() {
    assert_eq!(
        map_write_error(
            RepositoryError::Conflict(RepositoryConflict::MerchantChannelName),
            42,
            "create",
        ),
        MerchantChannelServiceError::NameAlreadyExists
    );
}

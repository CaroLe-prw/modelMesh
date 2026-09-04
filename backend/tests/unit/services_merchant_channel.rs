use crate::{
    domain::{AccountRole, MerchantChannelStatus},
    repository::{RepositoryConflict, RepositoryError},
    services::MerchantChannelServiceError,
    state::AppState,
};

#[tokio::test]
async fn merchant_cannot_use_the_admin_channel_status_operation() {
    let result = AppState::for_test()
        .merchant_channel_service
        .update_status_for_admin(
            1,
            AccountRole::Merchant,
            47,
            "00000000-0000-4000-8000-000000000001",
            MerchantChannelStatus::Offline,
            "Repeated upstream failures".to_owned(),
        )
        .await;

    assert_eq!(result, Err(MerchantChannelServiceError::Forbidden));
}

#[tokio::test]
async fn administrator_cannot_take_a_channel_offline_without_a_reason() {
    let result = AppState::for_test()
        .merchant_channel_service
        .update_status_for_admin(
            1,
            AccountRole::Admin,
            47,
            "00000000-0000-4000-8000-000000000001",
            MerchantChannelStatus::Offline,
            "   ".to_owned(),
        )
        .await;

    assert_eq!(result, Err(MerchantChannelServiceError::InvalidInput));
}

use super::{
    map_write_error, normalize_api_key, normalize_available_models, normalize_base_url,
    normalize_description, normalize_name, normalize_provider_id, normalize_supported_models,
    resolve_update_status, validate_channel_id,
};

#[test]
fn approved_channel_review_fields_are_locked() {
    assert_eq!(
        resolve_update_status(
            MerchantChannelStatus::Active,
            true,
            true,
            MerchantChannelStatus::Active,
        ),
        Err(MerchantChannelServiceError::ReviewFieldsLocked)
    );
}

#[test]
fn pending_channel_stays_pending_when_saved_without_changes() {
    assert_eq!(
        resolve_update_status(
            MerchantChannelStatus::Pending,
            false,
            false,
            MerchantChannelStatus::Active,
        ),
        Ok((MerchantChannelStatus::Pending, false))
    );
}

#[test]
fn editing_pending_channel_config_refreshes_the_review_submission() {
    assert_eq!(
        resolve_update_status(
            MerchantChannelStatus::Pending,
            false,
            true,
            MerchantChannelStatus::Offline,
        ),
        Ok((MerchantChannelStatus::Pending, true))
    );
}

#[test]
fn approved_channel_can_change_runtime_status_without_another_review() {
    assert_eq!(
        resolve_update_status(
            MerchantChannelStatus::Offline,
            false,
            true,
            MerchantChannelStatus::Active,
        ),
        Ok((MerchantChannelStatus::Active, false))
    );
}

#[test]
fn saving_a_rejected_channel_resubmits_it_even_without_detail_changes() {
    assert_eq!(
        resolve_update_status(
            MerchantChannelStatus::Rejected,
            false,
            false,
            MerchantChannelStatus::Offline,
        ),
        Ok((MerchantChannelStatus::Pending, true))
    );
}

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

#[test]
fn channel_connection_fields_are_normalized_and_bounded() {
    assert_eq!(
        normalize_base_url(" https://api.example.com/v1/ ".to_owned()),
        Ok("https://api.example.com/v1".to_owned())
    );
    for invalid in [
        "http://api.example.com/v1",
        "https://localhost/v1",
        "https://user:password@example.com/v1",
        "https://api.example.com/v1?key=secret",
    ] {
        assert_eq!(
            normalize_base_url(invalid.to_owned()),
            Err(MerchantChannelServiceError::InvalidInput)
        );
    }
    assert_eq!(
        normalize_api_key(" secret ".to_owned()),
        Ok("secret".to_owned())
    );
    assert_eq!(
        normalize_description(" reliable route ".to_owned()),
        Ok("reliable route".to_owned())
    );
}

#[test]
fn supported_models_are_sorted_deduplicated_and_required() {
    assert_eq!(
        normalize_supported_models(vec![
            " gpt-5 ".to_owned(),
            "gpt-4.1".to_owned(),
            "gpt-5".to_owned(),
        ]),
        Ok(vec!["gpt-4.1".to_owned(), "gpt-5".to_owned()])
    );
    assert_eq!(
        normalize_supported_models(Vec::new()),
        Err(MerchantChannelServiceError::InvalidInput)
    );
}

#[test]
fn available_models_keep_unselected_options_and_include_supported_models() {
    let supported_models = vec!["gpt-5.4".to_owned()];

    assert_eq!(
        normalize_available_models(
            vec!["gpt-5.6-sol".to_owned(), "gpt-5.5".to_owned()],
            &supported_models,
        ),
        Ok(vec![
            "gpt-5.4".to_owned(),
            "gpt-5.5".to_owned(),
            "gpt-5.6-sol".to_owned(),
        ])
    );
}

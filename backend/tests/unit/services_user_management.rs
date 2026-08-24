use crate::domain::{AccountRole, AccountStatus};
use crate::services::management_search::{ManagementSearch, management_search};

use super::{
    CreateManagedUser, UpdateManagedUser, UserManagementServiceError, validate_balance_adjustment,
    validate_create, validate_delete_user_ids, validate_update,
};

fn valid_create() -> CreateManagedUser {
    CreateManagedUser {
        email: "user@example.com".to_owned(),
        password: "strong-password".to_owned(),
        username: None,
        role: AccountRole::Personal,
        balance_microusd: 0,
        concurrency_limit: 1,
        rpm_limit: 0,
    }
}

fn valid_update() -> UpdateManagedUser {
    UpdateManagedUser {
        email: "user@example.com".to_owned(),
        password: None,
        username: "User".to_owned(),
        notes: String::new(),
        role: AccountRole::Personal,
        status: AccountStatus::Active,
        concurrency_limit: 100_000,
        rpm_limit: 0,
    }
}

#[test]
fn search_is_bounded_escaped_and_recognizes_display_user_ids() {
    assert_eq!(
        management_search(Some(" user_42 ".to_owned())),
        Ok(ManagementSearch {
            exact_user_id: Some(42),
            pattern: Some("%user\\_42%".to_owned()),
        })
    );
    assert_eq!(
        management_search(Some("100%_admin".to_owned())),
        Ok(ManagementSearch {
            exact_user_id: None,
            pattern: Some("%100\\%\\_admin%".to_owned()),
        })
    );
    assert_eq!(
        management_search(Some("merchant_47".to_owned())),
        Ok(ManagementSearch {
            exact_user_id: Some(47),
            pattern: Some("%merchant\\_47%".to_owned()),
        })
    );
    assert_eq!(management_search(Some("x".repeat(257))), Err(()));
}

#[test]
fn administrator_cannot_remove_their_own_access() {
    let disabled = UpdateManagedUser {
        role: AccountRole::Admin,
        status: AccountStatus::Disabled,
        ..valid_update()
    };
    let demoted = UpdateManagedUser {
        role: AccountRole::Personal,
        status: AccountStatus::Active,
        ..valid_update()
    };

    assert_eq!(
        validate_update(42, 42, &disabled),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_update(42, 42, &demoted),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(validate_update(42, 7, &disabled), Ok(()));
}

#[test]
fn balance_adjustment_requires_a_positive_safe_amount_and_bounded_notes() {
    assert_eq!(validate_balance_adjustment(42, 1, "余额调整"), Ok(()));
    assert_eq!(
        validate_balance_adjustment(0, 1, ""),
        Err(UserManagementServiceError::InvalidBalanceAdjustment)
    );
    assert_eq!(
        validate_balance_adjustment(42, 0, ""),
        Err(UserManagementServiceError::InvalidBalanceAdjustment)
    );
    assert_eq!(
        validate_balance_adjustment(42, 9_007_199_254_740_992, ""),
        Err(UserManagementServiceError::InvalidBalanceAdjustment)
    );
    assert_eq!(
        validate_balance_adjustment(42, 1, &"x".repeat(1_001)),
        Err(UserManagementServiceError::InvalidBalanceAdjustment)
    );
}

#[test]
fn managed_request_limits_must_fit_unsigned_32_bit_values() {
    let invalid_concurrency = UpdateManagedUser {
        concurrency_limit: -1,
        ..valid_update()
    };
    let invalid_rpm = UpdateManagedUser {
        rpm_limit: 4_294_967_296,
        ..valid_update()
    };

    assert_eq!(
        validate_update(42, 7, &invalid_concurrency),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_update(42, 7, &invalid_rpm),
        Err(UserManagementServiceError::InvalidInput)
    );
}

#[test]
fn managed_profile_fields_and_optional_password_are_validated() {
    let invalid_email = UpdateManagedUser {
        email: "not-an-email".to_owned(),
        ..valid_update()
    };
    let blank_username = UpdateManagedUser {
        username: "   ".to_owned(),
        ..valid_update()
    };
    let long_notes = UpdateManagedUser {
        notes: "x".repeat(1_001),
        ..valid_update()
    };
    let control_username = UpdateManagedUser {
        username: "bad\nname".to_owned(),
        ..valid_update()
    };
    let short_password = UpdateManagedUser {
        password: Some("short".to_owned()),
        ..valid_update()
    };

    assert_eq!(
        validate_update(42, 7, &invalid_email),
        Err(UserManagementServiceError::InvalidEmail)
    );
    assert_eq!(
        validate_update(42, 7, &blank_username),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_update(42, 7, &long_notes),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_update(42, 7, &control_username),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_update(42, 7, &short_password),
        Err(UserManagementServiceError::InvalidPassword)
    );
    assert_eq!(validate_update(42, 7, &valid_update()), Ok(()));
}

#[test]
fn managed_user_creation_validates_credentials_balance_and_limits() {
    assert_eq!(validate_create(&valid_create()), Ok(()));
    assert_eq!(
        validate_create(&CreateManagedUser {
            email: "invalid".to_owned(),
            ..valid_create()
        }),
        Err(UserManagementServiceError::InvalidEmail)
    );
    assert_eq!(
        validate_create(&CreateManagedUser {
            password: "short".to_owned(),
            ..valid_create()
        }),
        Err(UserManagementServiceError::InvalidPassword)
    );
    assert_eq!(
        validate_create(&CreateManagedUser {
            username: Some("bad\nname".to_owned()),
            ..valid_create()
        }),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_create(&CreateManagedUser {
            balance_microusd: -1,
            ..valid_create()
        }),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_create(&CreateManagedUser {
            concurrency_limit: 4_294_967_296,
            ..valid_create()
        }),
        Err(UserManagementServiceError::InvalidInput)
    );
}

#[test]
fn managed_user_deletion_is_bounded_deduplicated_and_cannot_include_requester() {
    assert_eq!(
        validate_delete_user_ids(1, vec![42, 7, 42]),
        Ok(vec![7, 42])
    );
    assert_eq!(
        validate_delete_user_ids(42, vec![7, 42]),
        Err(UserManagementServiceError::DeleteConflict)
    );
    assert_eq!(
        validate_delete_user_ids(1, Vec::new()),
        Err(UserManagementServiceError::InvalidInput)
    );
    assert_eq!(
        validate_delete_user_ids(1, (2..=52).collect()),
        Err(UserManagementServiceError::InvalidInput)
    );
}

use crate::domain::{
    AccountRole, AccountStatus, ManagedUser, ManagedUserBalanceAdjustment,
    ManagedUserBalanceAdjustmentKind, ManagedUserSortField, SortDirection,
};
use serde_json::json;

use super::{
    BatchDeleteManagedUsersRequest, BatchDeleteManagedUsersResponse, CreateManagedUserRequest,
    ManagedUserBalanceAdjustmentResponse, ManagedUserBalanceAdjustmentTypeValue,
    ManagedUserResponse, ManagedUserSortFieldValue, SortDirectionValue,
};

#[test]
fn managed_user_response_uses_camel_case_and_utc_instants() {
    let response = ManagedUserResponse::from(ManagedUser {
        id: 42,
        email: "admin@example.com".to_owned(),
        username: "Admin".to_owned(),
        notes: "Primary operator".to_owned(),
        role: AccountRole::Admin,
        status: AccountStatus::Active,
        balance_microusd: 12_500_000,
        concurrency_limit: 100_000,
        rpm_limit: 0,
        last_login_at: Some(
            "2026-08-11T03:20:00Z"
                .parse()
                .expect("last login timestamp should be valid"),
        ),
        last_login_ip: Some("203.0.113.10".to_owned()),
        last_active_at: Some(
            "2026-08-11T03:25:00Z"
                .parse()
                .expect("last active timestamp should be valid"),
        ),
        last_used_at: Some(
            "2026-08-11T03:24:00Z"
                .parse()
                .expect("last used timestamp should be valid"),
        ),
        created_at: "2026-07-01T00:00:00Z"
            .parse()
            .expect("creation timestamp should be valid"),
    });
    let value = serde_json::to_value(response).expect("response should serialize");

    assert_eq!(value["id"], json!(42));
    assert_eq!(value["username"], json!("Admin"));
    assert_eq!(value["notes"], json!("Primary operator"));
    assert_eq!(value["balanceMicrousd"], json!(12_500_000));
    assert_eq!(value["concurrencyLimit"], json!(100_000));
    assert_eq!(value["rpmLimit"], json!(0));
    assert_eq!(value["lastLoginAt"], json!("2026-08-11T03:20:00Z"));
    assert_eq!(value["lastLoginIp"], json!("203.0.113.10"));
    assert_eq!(value["lastActiveAt"], json!("2026-08-11T03:25:00Z"));
    assert_eq!(value["lastUsedAt"], json!("2026-08-11T03:24:00Z"));
    assert_eq!(value["createdAt"], json!("2026-07-01T00:00:00Z"));
}

#[test]
fn user_sort_values_match_the_public_camel_case_query_contract() {
    let balance: ManagedUserSortFieldValue =
        serde_json::from_value(json!("balanceMicrousd")).expect("sort field should deserialize");
    let last_active: ManagedUserSortFieldValue =
        serde_json::from_value(json!("lastActiveAt")).expect("sort field should deserialize");
    let ascending: SortDirectionValue =
        serde_json::from_value(json!("asc")).expect("sort direction should deserialize");

    assert_eq!(
        ManagedUserSortField::from(balance),
        ManagedUserSortField::Balance
    );
    assert_eq!(
        ManagedUserSortField::from(last_active),
        ManagedUserSortField::LastActive
    );
    assert_eq!(SortDirection::from(ascending), SortDirection::Asc);
}

#[test]
fn balance_adjustment_response_and_filter_use_the_public_contract() {
    let filter: ManagedUserBalanceAdjustmentTypeValue =
        serde_json::from_value(json!("refund")).expect("adjustment filter should deserialize");
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::from(filter),
        ManagedUserBalanceAdjustmentKind::Refund
    );

    let response = ManagedUserBalanceAdjustmentResponse::from(ManagedUserBalanceAdjustment {
        id: 7,
        user_id: 42,
        operator_user_id: 1,
        adjustment_type: ManagedUserBalanceAdjustmentKind::Deposit,
        amount_microusd: 2_500_000,
        balance_after_microusd: 12_500_000,
        notes: "manual".to_owned(),
        created_at: "2026-08-12T04:00:00Z"
            .parse()
            .expect("adjustment timestamp should be valid"),
    });
    let value = serde_json::to_value(response).expect("adjustment response should serialize");

    assert_eq!(value["adjustmentType"], json!("deposit"));
    assert_eq!(value["amountMicrousd"], json!(2_500_000));
    assert_eq!(value["balanceAfterMicrousd"], json!(12_500_000));
    assert_eq!(value["createdAt"], json!("2026-08-12T04:00:00Z"));
}

#[test]
fn managed_user_creation_accepts_an_optional_username() {
    let request: CreateManagedUserRequest = serde_json::from_value(json!({
        "email": "user@example.com",
        "password": "strong-password",
        "role": "personal",
        "balanceMicrousd": 0,
        "concurrencyLimit": 1,
        "rpmLimit": 0
    }))
    .expect("create request should deserialize");

    assert_eq!(request.email, "user@example.com");
    assert_eq!(request.username, None);
    assert_eq!(AccountRole::from(request.role), AccountRole::Personal);
}

#[test]
fn managed_user_batch_deletion_uses_the_public_camel_case_contract() {
    let request: BatchDeleteManagedUsersRequest =
        serde_json::from_value(json!({ "userIds": [41, 42] }))
            .expect("batch deletion request should deserialize");
    assert_eq!(request.user_ids, vec![41, 42]);

    let response = serde_json::to_value(BatchDeleteManagedUsersResponse { deleted_count: 2 })
        .expect("batch deletion response should serialize");
    assert_eq!(response, json!({ "deletedCount": 2 }));
}

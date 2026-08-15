use sea_orm::{DatabaseBackend, QueryTrait};

use crate::domain::{
    AccountRole, AccountStatus, ManagedUserBalanceAdjustmentKind, ManagedUserSort,
    ManagedUserSortField, SortDirection,
};

use super::{UserSearch, user_list_query};

#[test]
fn balance_adjustments_use_opposite_deltas_and_stable_audit_types() {
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::Deposit.delta(1_500_000),
        1_500_000
    );
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::Refund.delta(1_500_000),
        -1_500_000
    );
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::Deposit.as_str(),
        "deposit"
    );
    assert_eq!(ManagedUserBalanceAdjustmentKind::Refund.as_str(), "refund");
}

#[test]
fn list_query_filters_identity_role_status_and_uses_stable_sorting() {
    let query = user_list_query(
        &UserSearch {
            exact_user_id: Some(42),
            pattern: Some("%admin\\_%".to_owned()),
            role: Some(AccountRole::Admin),
            status: Some(AccountStatus::Active),
        },
        ManagedUserSort::default(),
    )
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains("ILIKE"));
    assert!(query.contains(r#""users"."email""#));
    assert!(query.contains(r#""users"."username""#));
    assert!(query.contains("CAST"));
    assert!(query.contains(r#""users"."last_login_ip""#));
    assert!(query.contains(r#""users"."id""#));
    assert!(query.contains(r#""users"."role""#));
    assert!(query.contains(r#""users"."status""#));
    assert!(query.contains("SELECT MAX(api_keys.last_used_at)"));
    assert!(query.contains(r#"AS "last_used_at""#));
    assert!(query.contains(r#"COUNT(*) OVER() AS "total_count""#));
    assert!(query.contains(r#"ORDER BY "users"."created_at" DESC"#));
    assert!(query.contains(r#""users"."id" DESC"#));
}

#[test]
fn list_query_sorts_nullable_activity_fields_last() {
    let search = UserSearch {
        exact_user_id: None,
        pattern: None,
        role: None,
        status: None,
    };
    let last_active = user_list_query(
        &search,
        ManagedUserSort {
            field: ManagedUserSortField::LastActive,
            direction: SortDirection::Asc,
        },
    )
    .build(DatabaseBackend::Postgres)
    .to_string();
    let last_used = user_list_query(
        &search,
        ManagedUserSort {
            field: ManagedUserSortField::LastUsed,
            direction: SortDirection::Desc,
        },
    )
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(last_active.contains(r#""users"."last_active_at" ASC NULLS LAST"#));
    assert!(last_used.contains("SELECT MAX(api_keys.last_used_at)"));
    assert!(last_used.contains("DESC NULLS LAST"));
}

#[test]
fn list_query_sorts_by_available_balance_with_a_stable_tie_breaker() {
    let query = user_list_query(
        &UserSearch {
            exact_user_id: None,
            pattern: None,
            role: None,
            status: None,
        },
        ManagedUserSort {
            field: ManagedUserSortField::Balance,
            direction: SortDirection::Desc,
        },
    )
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains(r#"ORDER BY "users"."balance_microusd" DESC"#));
    assert!(query.contains(r#""users"."id" DESC"#));
}

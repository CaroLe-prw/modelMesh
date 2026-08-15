use super::{AccountRole, AccountStatus, ManagedUserBalanceAdjustmentKind};

#[test]
fn database_role_values_are_strict() {
    assert_eq!(
        AccountRole::from_database("personal"),
        Some(AccountRole::Personal)
    );
    assert_eq!(
        AccountRole::from_database("merchant"),
        Some(AccountRole::Merchant)
    );
    assert_eq!(
        AccountRole::from_database("admin"),
        Some(AccountRole::Admin)
    );
    assert_eq!(AccountRole::from_database("owner"), None);
}

#[test]
fn database_status_values_are_strict() {
    assert_eq!(
        AccountStatus::from_database("active"),
        Some(AccountStatus::Active)
    );
    assert_eq!(
        AccountStatus::from_database("disabled"),
        Some(AccountStatus::Disabled)
    );
    assert_eq!(AccountStatus::from_database("suspended"), None);
}

#[test]
fn database_balance_adjustment_values_are_strict() {
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::from_database("deposit"),
        Some(ManagedUserBalanceAdjustmentKind::Deposit)
    );
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::from_database("refund"),
        Some(ManagedUserBalanceAdjustmentKind::Refund)
    );
    assert_eq!(
        ManagedUserBalanceAdjustmentKind::from_database("chargeback"),
        None
    );
}

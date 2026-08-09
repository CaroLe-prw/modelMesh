use super::AccountRole;

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

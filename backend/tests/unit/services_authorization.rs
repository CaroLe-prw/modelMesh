use crate::domain::AccountRole;

use super::{require_admin, require_merchant};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TestError {
    Forbidden,
}

#[test]
fn administrator_satisfies_admin_policy() {
    assert_eq!(
        require_admin(AccountRole::Admin, TestError::Forbidden),
        Ok(())
    );
}

#[test]
fn non_administrators_receive_the_callers_forbidden_error() {
    for role in [AccountRole::Personal, AccountRole::Merchant] {
        assert_eq!(
            require_admin(role, TestError::Forbidden),
            Err(TestError::Forbidden)
        );
    }
}

#[test]
fn merchants_and_administrators_satisfy_merchant_policy() {
    for role in [AccountRole::Merchant, AccountRole::Admin] {
        assert_eq!(require_merchant(role, TestError::Forbidden), Ok(()));
    }
}

#[test]
fn personal_accounts_cannot_use_merchant_operations() {
    assert_eq!(
        require_merchant(AccountRole::Personal, TestError::Forbidden),
        Err(TestError::Forbidden)
    );
}

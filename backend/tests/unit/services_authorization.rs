use crate::domain::AccountRole;

use super::require_admin;

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

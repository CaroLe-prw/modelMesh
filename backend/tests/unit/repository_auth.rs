use crate::domain::{AccountRole, MerchantAccessStatus};

use super::session_role;

#[test]
fn disabled_merchant_keeps_a_personal_login_session() {
    assert_eq!(
        session_role(AccountRole::Merchant, MerchantAccessStatus::Disabled),
        AccountRole::Personal
    );
}

#[test]
fn active_merchant_keeps_merchant_access() {
    assert_eq!(
        session_role(AccountRole::Merchant, MerchantAccessStatus::Active),
        AccountRole::Merchant
    );
}

#[test]
fn merchant_status_does_not_change_other_account_roles() {
    assert_eq!(
        session_role(AccountRole::Personal, MerchantAccessStatus::Disabled),
        AccountRole::Personal
    );
    assert_eq!(
        session_role(AccountRole::Admin, MerchantAccessStatus::Disabled),
        AccountRole::Admin
    );
}

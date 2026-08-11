use super::{AppRouteServiceError, affected_roles, parse_roles, validate_managed_route_roles};
use crate::{
    domain::{AccountRole, AppRoute, AppRouteGroup},
    repository::AppRouteRoleChange,
};

#[test]
fn role_updates_are_strict_and_deduplicated() {
    assert_eq!(
        parse_roles(vec![
            "admin".to_owned(),
            "personal".to_owned(),
            "admin".to_owned(),
        ]),
        Ok(vec![AccountRole::Admin, AccountRole::Personal])
    );
    assert_eq!(
        parse_roles(vec!["owner".to_owned()]),
        Err(AppRouteServiceError::InvalidRoles)
    );
}

#[test]
fn route_access_management_cannot_lock_out_administrators() {
    assert_eq!(
        validate_managed_route_roles("admin.route-access", &[AccountRole::Admin]),
        Ok(())
    );
    assert_eq!(
        validate_managed_route_roles(
            "admin.route-access",
            &[AccountRole::Admin, AccountRole::Merchant],
        ),
        Err(AppRouteServiceError::InvalidRoles)
    );
    assert_eq!(validate_managed_route_roles("account.profile", &[]), Ok(()));
}

#[test]
fn cache_invalidation_covers_previous_and_new_roles() {
    let change = AppRouteRoleChange {
        previous_roles: vec![AccountRole::Personal, AccountRole::Merchant],
        route: AppRoute {
            route_key: "account.billing".to_owned(),
            path: "/account/billing".to_owned(),
            label_key: "pages.account.navigation.billing".to_owned(),
            icon_key: "circle-dollar-sign".to_owned(),
            group: AppRouteGroup::Personal,
            sort_order: 120,
            enabled: true,
            roles: vec![AccountRole::Merchant, AccountRole::Admin],
        },
    };

    assert_eq!(
        affected_roles(&change),
        vec![
            AccountRole::Personal,
            AccountRole::Merchant,
            AccountRole::Admin,
        ]
    );
}

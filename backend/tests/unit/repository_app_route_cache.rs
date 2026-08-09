use super::{deserialize_routes, serialize_routes};
use crate::domain::{AccountRole, AppRoute, AppRouteGroup};

#[test]
fn cached_routes_round_trip_for_the_same_role() {
    let routes = vec![sample_route()];
    let value =
        serialize_routes(AccountRole::Merchant, &routes).expect("route cache should serialize");
    let restored =
        deserialize_routes(&value, AccountRole::Merchant).expect("route cache should deserialize");

    assert_eq!(restored.len(), 1);
    assert_eq!(restored[0].route_key, "account.profile");
    assert_eq!(restored[0].group, AppRouteGroup::Personal);
    assert_eq!(restored[0].roles, vec![AccountRole::Merchant]);
}

#[test]
fn cached_routes_are_rejected_after_a_user_role_change() {
    let value = serialize_routes(AccountRole::Personal, &[sample_route()])
        .expect("route cache should serialize");

    assert!(deserialize_routes(&value, AccountRole::Admin).is_none());
}

fn sample_route() -> AppRoute {
    AppRoute {
        route_key: "account.profile".to_owned(),
        path: "/account/profile".to_owned(),
        label_key: "pages.account.navigation.profile".to_owned(),
        icon_key: "user-round".to_owned(),
        group: AppRouteGroup::Personal,
        sort_order: 160,
        enabled: true,
        roles: vec![AccountRole::Merchant],
    }
}

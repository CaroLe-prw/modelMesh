use serde::{Deserialize, Serialize};

use crate::domain::AppRoute;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRouteResponse {
    pub route_key: String,
    pub path: String,
    pub label_key: String,
    pub icon_key: String,
    pub group: String,
    pub sort_order: i32,
    pub enabled: bool,
    pub roles: Vec<String>,
}

impl From<AppRoute> for AppRouteResponse {
    fn from(route: AppRoute) -> Self {
        Self {
            route_key: route.route_key,
            path: route.path,
            label_key: route.label_key,
            icon_key: route.icon_key,
            group: route.group.as_str().to_owned(),
            sort_order: route.sort_order,
            enabled: route.enabled,
            roles: route
                .roles
                .into_iter()
                .map(|role| role.as_str().to_owned())
                .collect(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppRouteRolesRequest {
    pub roles: Vec<String>,
}

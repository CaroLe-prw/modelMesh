use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::app_route::{list_all, list_visible, update_roles},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/account-routes", get(list_visible))
        .route("/admin/account-routes", get(list_all))
        .route("/admin/account-routes/{route_key}/roles", put(update_roles))
}

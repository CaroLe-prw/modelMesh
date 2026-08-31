use axum::{Router, routing::get};

use crate::{handlers::system_settings, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/admin/system-settings",
            get(system_settings::admin_get).put(system_settings::admin_update),
        )
        .route(
            "/merchant/settlement-settings",
            get(system_settings::merchant_get_settlement),
        )
}

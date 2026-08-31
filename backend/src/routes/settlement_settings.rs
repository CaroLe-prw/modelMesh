use axum::{Router, routing::get};

use crate::{handlers::settlement_settings, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/admin/settlement-settings",
            get(settlement_settings::admin_get).put(settlement_settings::admin_update),
        )
        .route(
            "/merchant/settlement-settings",
            get(settlement_settings::merchant_get),
        )
}

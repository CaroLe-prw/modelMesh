use axum::{Router, routing::get};

use crate::{handlers::price_settings, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/admin/price-settings",
        get(price_settings::get).put(price_settings::update),
    )
}

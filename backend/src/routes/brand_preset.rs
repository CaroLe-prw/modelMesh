use axum::{Router, routing::get};

use crate::{handlers::brand_preset::list, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new().route("/admin/brand-presets", get(list))
}

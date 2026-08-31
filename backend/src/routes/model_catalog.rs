use axum::{Router, routing::get};

use crate::{
    handlers::model_catalog::{list, lookup, options},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/model-catalog/options", get(options))
        .route("/admin/model-catalog", get(list))
        .route("/admin/model-catalog/lookup", get(lookup))
}

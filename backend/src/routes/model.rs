use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::model::{create, create_batch, delete_model, list, update_pricing, update_status},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/models", get(list).post(create))
        .route("/admin/models/batch", axum::routing::post(create_batch))
        .route("/admin/models/{id}/status", put(update_status))
        .route(
            "/admin/models/{id}",
            put(update_pricing).delete(delete_model),
        )
}

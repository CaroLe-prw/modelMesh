use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::brand::{create, delete_brand, list, update, update_status},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/brands", get(list).post(create))
        .route(
            "/admin/brands/{identifier}",
            put(update).delete(delete_brand),
        )
        .route("/admin/brands/{identifier}/status", put(update_status))
}

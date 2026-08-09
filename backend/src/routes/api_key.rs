use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::api_key::{create, delete as delete_api_key, list, update, update_status},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api-keys", get(list).post(create))
        .route("/api-keys/{api_key_id}", put(update).delete(delete_api_key))
        .route("/api-keys/{api_key_id}/status", put(update_status))
}

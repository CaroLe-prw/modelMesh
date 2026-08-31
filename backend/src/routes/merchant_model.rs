use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::merchant_model::{create, delete, list, list_options, update, update_status},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/merchant/model-options", get(list_options))
        .route("/merchant/models", get(list).post(create))
        .route("/merchant/models/{listing_id}", put(update).delete(delete))
        .route("/merchant/models/{listing_id}/status", put(update_status))
}

use axum::{Router, routing::get};

use crate::{
    handlers::marketplace::{catalog, merchants, update_route},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/marketplace/catalog", get(catalog))
        .route("/marketplace/models/{model_id}/merchants", get(merchants))
        .route(
            "/marketplace/api-keys/{api_key_id}/models/{model_id}/merchants/{merchant_id}",
            axum::routing::put(update_route),
        )
}

use axum::{Router, routing::get};

use crate::{
    handlers::catalog_review::{list, review, test_connection, test_model},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/catalog-reviews", get(list))
        .route(
            "/admin/catalog-reviews/{review_id}/review",
            axum::routing::post(review),
        )
        .route(
            "/admin/catalog-reviews/{review_id}/test-connection",
            axum::routing::post(test_connection),
        )
        .route(
            "/admin/catalog-reviews/{review_id}/test-model",
            axum::routing::post(test_model),
        )
}

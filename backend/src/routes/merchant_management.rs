use axum::{
    Router,
    routing::{get, patch, post},
};

use crate::{
    handlers::merchant_management::{
        list, remove, remove_batch, review, update, update_status, update_status_batch,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/merchants", get(list))
        .route("/admin/merchants/batch-status", patch(update_status_batch))
        .route("/admin/merchants/batch-delete", post(remove_batch))
        .route("/admin/merchants/{user_id}", patch(update).delete(remove))
        .route("/admin/merchants/{user_id}/status", patch(update_status))
        .route("/admin/merchants/{user_id}/review", post(review))
}

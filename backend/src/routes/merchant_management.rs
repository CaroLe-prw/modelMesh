use axum::{
    Router,
    routing::{get, patch, post, put},
};

use crate::{
    handlers::merchant_management::{
        detail, latest_channel_operation, latest_model_operation, list, list_channels,
        list_model_logs, list_models, remove, remove_batch, review, update, update_channel_status,
        update_model_status, update_status, update_status_batch,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/merchants", get(list))
        .route("/admin/merchants/batch-status", patch(update_status_batch))
        .route("/admin/merchants/batch-delete", post(remove_batch))
        .route("/admin/merchants/{user_id}/channels", get(list_channels))
        .route(
            "/admin/merchants/{user_id}/channels/{channel_id}/latest-operation",
            get(latest_channel_operation),
        )
        .route("/admin/merchants/{user_id}/models", get(list_models))
        .route(
            "/admin/merchants/{user_id}/models/{listing_id}/latest-operation",
            get(latest_model_operation),
        )
        .route(
            "/admin/merchants/{user_id}/model-logs",
            get(list_model_logs),
        )
        .route(
            "/admin/merchants/{user_id}/channels/{channel_id}/status",
            put(update_channel_status),
        )
        .route(
            "/admin/merchants/{user_id}/models/{listing_id}/status",
            put(update_model_status),
        )
        .route(
            "/admin/merchants/{user_id}",
            get(detail).patch(update).delete(remove),
        )
        .route("/admin/merchants/{user_id}/status", patch(update_status))
        .route("/admin/merchants/{user_id}/review", post(review))
}

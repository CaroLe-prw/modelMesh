use axum::{Router, routing::get};

use crate::{
    handlers::user_management::{
        batch_delete_managed_users, create, delete_managed_user, deposit, list, list_api_keys,
        list_balance_adjustments, refund, update,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/users", get(list).post(create))
        .route(
            "/admin/users/batch-delete",
            axum::routing::post(batch_delete_managed_users),
        )
        .route("/admin/users/{user_id}/api-keys", get(list_api_keys))
        .route(
            "/admin/users/{user_id}/balance-adjustments",
            get(list_balance_adjustments),
        )
        .route(
            "/admin/users/{user_id}/deposit",
            axum::routing::post(deposit),
        )
        .route("/admin/users/{user_id}/refund", axum::routing::post(refund))
        .route(
            "/admin/users/{user_id}",
            axum::routing::put(update).delete(delete_managed_user),
        )
}

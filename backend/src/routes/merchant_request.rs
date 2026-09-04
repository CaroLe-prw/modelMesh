use axum::{Router, routing::get};

use crate::{
    handlers::merchant_request::{create, list, list_latest_channel_operations},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/merchant/requests", get(list).post(create))
        .route(
            "/merchant/channel-operations/latest",
            get(list_latest_channel_operations),
        )
}

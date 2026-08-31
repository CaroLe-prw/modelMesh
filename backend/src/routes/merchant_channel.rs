use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::merchant_channel::{
        create, delete, discover_models, list, list_providers, update, update_status,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/merchant/channel-providers", get(list_providers))
        .route("/merchant/channels", get(list).post(create))
        .route(
            "/merchant/channels/discover-models",
            axum::routing::post(discover_models),
        )
        .route(
            "/merchant/channels/{channel_id}",
            put(update).delete(delete),
        )
        .route("/merchant/channels/{channel_id}/status", put(update_status))
}

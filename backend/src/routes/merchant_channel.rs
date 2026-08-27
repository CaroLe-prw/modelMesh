use axum::{
    Router,
    routing::{get, put},
};

use crate::{
    handlers::merchant_channel::{create, delete, list, list_providers, update},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/merchant/channel-providers", get(list_providers))
        .route("/merchant/channels", get(list).post(create))
        .route(
            "/merchant/channels/{channel_id}",
            put(update).delete(delete),
        )
}

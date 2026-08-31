use axum::{Router, routing::get};

use crate::{
    handlers::merchant_request::{create, list},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/merchant/requests", get(list).post(create))
}

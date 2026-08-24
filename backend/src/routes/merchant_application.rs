use axum::{Router, routing::get};

use crate::{
    handlers::merchant_application::{current, submit},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/merchant-application", get(current).post(submit))
}

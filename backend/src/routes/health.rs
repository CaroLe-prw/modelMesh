use axum::{Router, routing::get};

use crate::{
    handlers::health::{get_health, get_readiness},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(get_health))
        .route("/health/ready", get(get_readiness))
}

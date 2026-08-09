mod api_key;
mod app_route;
mod auth;
mod health;

use axum::{Router, http::Request};
use tower_http::trace::{DefaultOnFailure, DefaultOnResponse, TraceLayer};
use tracing::Level;

use crate::state::AppState;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .nest("/api", api_router())
        .with_state(state)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &Request<_>| {
                    tracing::info_span!(
                        "http_request",
                        method = %request.method(),
                        path = request.uri().path(),
                        version = ?request.version()
                    )
                })
                .on_response(DefaultOnResponse::new().level(Level::INFO))
                .on_failure(DefaultOnFailure::new().level(Level::ERROR)),
        )
}

fn api_router() -> Router<AppState> {
    Router::new()
        .merge(app_route::router())
        .merge(api_key::router())
        .merge(auth::router())
        .merge(health::router())
}

#[cfg(test)]
#[path = "../tests/unit/routes.rs"]
mod tests;

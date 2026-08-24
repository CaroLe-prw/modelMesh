mod api_key;
mod app_route;
mod auth;
mod brand;
mod brand_preset;
mod health;
mod merchant_application;
mod merchant_management;
mod model;
mod model_catalog;
mod user_management;

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
        .merge(brand::router())
        .merge(brand_preset::router())
        .merge(health::router())
        .merge(model_catalog::router())
        .merge(model::router())
        .merge(merchant_application::router())
        .merge(merchant_management::router())
        .merge(user_management::router())
}

#[cfg(test)]
#[path = "../tests/unit/routes.rs"]
mod tests;

use axum::{
    Router,
    routing::{get, post},
};

use crate::{
    handlers::auth::{current_user, login, logout, register},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(current_user))
        .route("/auth/logout", post(logout))
}

use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode, header::AUTHORIZATION},
    response::IntoResponse,
};

use crate::{
    dto::{AuthRequest, AuthResponse, LoginResponse, UserResponse},
    error::AppError,
    state::AppState,
};

pub async fn register(
    State(state): State<AppState>,
    payload: Result<Json<AuthRequest>, JsonRejection>,
) -> Result<impl IntoResponse, AppError> {
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let user = state
        .auth_service
        .register(request.email, request.password)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            user: UserResponse::from(user),
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    payload: Result<Json<AuthRequest>, JsonRejection>,
) -> Result<impl IntoResponse, AppError> {
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let result = state
        .auth_service
        .login(request.email, request.password)
        .await?;

    Ok(Json(LoginResponse {
        access_token: result.access_token,
        user: UserResponse::from(result.user),
    }))
}

pub async fn current_user(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<UserResponse>, AppError> {
    let token = bearer_token(&headers).ok_or(AppError::Unauthenticated)?;
    let user = state.auth_service.current_user(token).await?;

    Ok(Json(UserResponse::from(user)))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let token = bearer_token(&headers).ok_or(AppError::Unauthenticated)?;
    state.auth_service.logout(token).await?;

    Ok(StatusCode::NO_CONTENT)
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    let authorization = headers.get(AUTHORIZATION)?.to_str().ok()?;
    let (scheme, token) = authorization.split_once(' ')?;

    (scheme.eq_ignore_ascii_case("Bearer")
        && token.len() == 64
        && token.bytes().all(|byte| byte.is_ascii_hexdigit()))
    .then_some(token)
}

#[cfg(test)]
#[path = "../../tests/unit/handlers_auth.rs"]
mod tests;

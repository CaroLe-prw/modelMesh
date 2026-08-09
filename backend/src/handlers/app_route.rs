use axum::{
    Json,
    extract::{Path, State, rejection::JsonRejection},
    http::HeaderMap,
};

use crate::{
    dto::{AppRouteResponse, UpdateAppRouteRolesRequest},
    error::AppError,
    handlers::auth::authenticate_user,
    state::AppState,
};

pub async fn list_visible(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AppRouteResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let routes = state
        .app_route_service
        .list_visible(user.id, user.role)
        .await?;

    Ok(Json(
        routes.into_iter().map(AppRouteResponse::from).collect(),
    ))
}

pub async fn list_all(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AppRouteResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let routes = state.app_route_service.list_all(user.role).await?;

    Ok(Json(
        routes.into_iter().map(AppRouteResponse::from).collect(),
    ))
}

pub async fn update_roles(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(route_key): Path<String>,
    payload: Result<Json<UpdateAppRouteRolesRequest>, JsonRejection>,
) -> Result<Json<AppRouteResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let route = state
        .app_route_service
        .update_roles(user.role, &route_key, request.roles)
        .await?;

    Ok(Json(AppRouteResponse::from(route)))
}

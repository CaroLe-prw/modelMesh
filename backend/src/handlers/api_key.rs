use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        ApiKeyResponse, ApiKeyStatusRequest, CreateApiKeyRequest, CreateApiKeyResponse,
        ListApiKeysQuery, PaginatedResponse, PaginationResponse, UpdateApiKeyRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user_id,
    services::{CreateApiKey, UpdateApiKey},
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListApiKeysQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<ApiKeyResponse>>, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .api_key_service
        .list(
            user_id,
            pagination,
            query.query,
            query.status.map(Into::into),
        )
        .await?;
    let items = result.items.into_iter().map(ApiKeyResponse::from).collect();

    Ok(Json(PaginatedResponse {
        items,
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateApiKeyRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<CreateApiKeyResponse>), AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let created = state
        .api_key_service
        .create(
            user_id,
            CreateApiKey {
                name: request.name,
                custom_key: request.custom_key,
                ip_restriction_enabled: request.ip_restriction_enabled,
                ip_whitelist: request.ip_whitelist,
                ip_blacklist: request.ip_blacklist,
                quota_limit_usd: request.quota_limit_usd,
                rate_limit_enabled: request.rate_limit_enabled,
                five_hour_limit_usd: request.five_hour_limit_usd,
                daily_limit_usd: request.daily_limit_usd,
                weekly_limit_usd: request.weekly_limit_usd,
                expires_at: request.expires_at,
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateApiKeyResponse {
            api_key: ApiKeyResponse::from(created.api_key),
            plain_text_key: created.plain_text_key,
        }),
    ))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(api_key_id): Path<String>,
    payload: Result<Json<UpdateApiKeyRequest>, JsonRejection>,
) -> Result<Json<ApiKeyResponse>, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let api_key = state
        .api_key_service
        .update(
            user_id,
            &api_key_id,
            UpdateApiKey {
                name: request.name,
                ip_restriction_enabled: request.ip_restriction_enabled,
                ip_whitelist: request.ip_whitelist,
                ip_blacklist: request.ip_blacklist,
                quota_limit_usd: request.quota_limit_usd,
                rate_limit_enabled: request.rate_limit_enabled,
                five_hour_limit_usd: request.five_hour_limit_usd,
                daily_limit_usd: request.daily_limit_usd,
                weekly_limit_usd: request.weekly_limit_usd,
                expires_at: request.expires_at,
            },
        )
        .await?;

    Ok(Json(ApiKeyResponse::from(api_key)))
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(api_key_id): Path<String>,
    payload: Result<Json<ApiKeyStatusRequest>, JsonRejection>,
) -> Result<Json<ApiKeyResponse>, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let api_key = state
        .api_key_service
        .update_status(user_id, &api_key_id, request.status.into())
        .await?;

    Ok(Json(ApiKeyResponse::from(api_key)))
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(api_key_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    state.api_key_service.delete(user_id, &api_key_id).await?;

    Ok(StatusCode::NO_CONTENT)
}

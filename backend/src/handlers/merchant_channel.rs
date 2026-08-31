use axum::{
    Json,
    extract::{Path, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        CreateMerchantChannelRequest, DiscoverMerchantChannelModelsRequest,
        DiscoverMerchantChannelModelsResponse, MerchantChannelProviderResponse,
        MerchantChannelResponse, UpdateMerchantChannelRequest, UpdateMerchantChannelStatusRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{CreateMerchantChannel, DiscoverMerchantChannelModels, UpdateMerchantChannel},
    state::AppState,
};

pub async fn list_providers(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantChannelProviderResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let providers = state
        .brand_service
        .list_channel_providers(user.role)
        .await?;

    Ok(Json(
        providers
            .into_iter()
            .map(MerchantChannelProviderResponse::from)
            .collect(),
    ))
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantChannelResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let channels = state
        .merchant_channel_service
        .list(user.id, user.role)
        .await?;

    Ok(Json(
        channels
            .into_iter()
            .map(MerchantChannelResponse::from)
            .collect(),
    ))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateMerchantChannelRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<MerchantChannelResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let channel = state
        .merchant_channel_service
        .create(
            user.id,
            user.role,
            CreateMerchantChannel {
                api_key: request.api_key,
                available_models: request.available_models,
                base_url: request.base_url,
                description: request.description,
                name: request.name,
                provider_id: request.provider_id,
                supported_models: request.supported_models,
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(MerchantChannelResponse::from(channel)),
    ))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<String>,
    payload: Result<Json<UpdateMerchantChannelRequest>, JsonRejection>,
) -> Result<Json<MerchantChannelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let channel = state
        .merchant_channel_service
        .update(
            user.id,
            user.role,
            &channel_id,
            UpdateMerchantChannel {
                api_key: request.api_key,
                available_models: request.available_models,
                base_url: request.base_url,
                description: request.description,
                name: request.name,
                provider_id: request.provider_id,
                status: request.status.into(),
                supported_models: request.supported_models,
            },
        )
        .await?;

    Ok(Json(MerchantChannelResponse::from(channel)))
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<String>,
    payload: Result<Json<UpdateMerchantChannelStatusRequest>, JsonRejection>,
) -> Result<Json<MerchantChannelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let channel = state
        .merchant_channel_service
        .update_status(user.id, user.role, &channel_id, request.status.into())
        .await?;

    Ok(Json(MerchantChannelResponse::from(channel)))
}

pub async fn discover_models(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<DiscoverMerchantChannelModelsRequest>, JsonRejection>,
) -> Result<Json<DiscoverMerchantChannelModelsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let models = state
        .merchant_channel_service
        .discover_models(
            user.id,
            user.role,
            DiscoverMerchantChannelModels {
                api_key: request.api_key,
                base_url: request.base_url,
                channel_id: request.channel_id,
                provider_id: request.provider_id,
            },
        )
        .await?;

    Ok(Json(DiscoverMerchantChannelModelsResponse { models }))
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    state
        .merchant_channel_service
        .delete(user.id, user.role, &channel_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

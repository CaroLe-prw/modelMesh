use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        CreateMerchantModelRequest, ListMerchantModelOptionsQuery, MerchantModelOptionsResponse,
        MerchantModelResponse, MerchantPriceConversionModeValue, UpdateMerchantModelRequest,
        UpdateMerchantModelStatusRequest,
    },
    error::AppError,
    handlers::{auth::authenticate_user, model::price_override_input},
    services::{CreateMerchantModel, MerchantPriceConversionMode, UpdateMerchantModel},
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantModelResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let models = state
        .merchant_model_service
        .list(user.id, user.role)
        .await?;

    Ok(Json(
        models
            .into_iter()
            .map(MerchantModelResponse::from)
            .collect(),
    ))
}

pub async fn list_options(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListMerchantModelOptionsQuery>,
) -> Result<Json<MerchantModelOptionsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let models = state
        .merchant_model_service
        .list_options(user.id, user.role, &query.channel_id)
        .await?;

    Ok(Json(MerchantModelOptionsResponse::from(models)))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateMerchantModelRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<MerchantModelResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .merchant_model_service
        .create(
            user.id,
            user.role,
            CreateMerchantModel {
                channel_id: request.channel_id,
                conversion_mode: conversion_mode(request.conversion_mode),
                exchange_rate: request.exchange_rate.to_string(),
                model_id: request.model_id,
                input_price: request.input_price.to_string(),
                output_price: request.output_price.to_string(),
                price_currency: request.price_currency,
                price_overrides: request
                    .price_overrides
                    .into_iter()
                    .map(price_override_input)
                    .collect(),
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(MerchantModelResponse::from(model)),
    ))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(listing_id): Path<String>,
    payload: Result<Json<UpdateMerchantModelRequest>, JsonRejection>,
) -> Result<Json<MerchantModelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .merchant_model_service
        .update(
            user.id,
            user.role,
            &listing_id,
            UpdateMerchantModel {
                channel_id: request.channel_id,
                conversion_mode: conversion_mode(request.conversion_mode),
                exchange_rate: request.exchange_rate.to_string(),
                model_id: request.model_id,
                input_price: request.input_price.to_string(),
                output_price: request.output_price.to_string(),
                price_currency: request.price_currency,
                price_overrides: request
                    .price_overrides
                    .into_iter()
                    .map(price_override_input)
                    .collect(),
            },
        )
        .await?;

    Ok(Json(MerchantModelResponse::from(model)))
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(listing_id): Path<String>,
    payload: Result<Json<UpdateMerchantModelStatusRequest>, JsonRejection>,
) -> Result<Json<MerchantModelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .merchant_model_service
        .update_status(user.id, user.role, &listing_id, request.status.into())
        .await?;

    Ok(Json(MerchantModelResponse::from(model)))
}

fn conversion_mode(value: MerchantPriceConversionModeValue) -> MerchantPriceConversionMode {
    match value {
        MerchantPriceConversionModeValue::Parity => MerchantPriceConversionMode::Parity,
        MerchantPriceConversionModeValue::FixedRate => MerchantPriceConversionMode::FixedRate,
    }
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(listing_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    state
        .merchant_model_service
        .delete(user.id, user.role, &listing_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

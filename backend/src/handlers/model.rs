use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        BatchCreateModelsRequest, CreateModelRequest, ListModelsQuery, ModelPriceGroupRequest,
        ModelPriceOverrideRequest, ModelResponse, ModelStatusRequest, PaginatedResponse,
        PaginationResponse, UpdateModelPricingRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{
        CreateCatalogModels, CreateModel, ModelPriceGroupInput, ModelPriceOverrideInput,
        UpdateModelPricing,
    },
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListModelsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<ModelResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .model_service
        .list(
            user.role,
            pagination,
            query.query,
            query.brand_id,
            query.status.map(Into::into),
        )
        .await?;
    let items = result.items.into_iter().map(ModelResponse::from).collect();

    Ok(Json(PaginatedResponse {
        items,
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateModelRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<ModelResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .model_service
        .create(
            user.role,
            CreateModel {
                brand_identifier: request.brand_id,
                identifier: request.identifier,
                name: request.name,
                context_window: request.context_window,
                input_price: request.input_price,
                cache_read_price: request.cache_read_price,
                cache_write_price: request.cache_write_price,
                output_price: request.output_price,
                price_overrides: request
                    .price_overrides
                    .into_iter()
                    .map(price_override_input)
                    .collect(),
                status: request.status.into(),
            },
        )
        .await?;

    Ok((StatusCode::CREATED, Json(ModelResponse::from(model))))
}

pub async fn create_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<BatchCreateModelsRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<Vec<ModelResponse>>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let models = state
        .model_service
        .create_catalog_models(
            user.role,
            CreateCatalogModels {
                brand_identifier: request.brand_id,
                model_identifiers: request.model_ids,
                input_price: request.input_price,
                cache_read_price: request.cache_read_price,
                cache_write_price: request.cache_write_price,
                output_price: request.output_price,
                price_overrides: request
                    .price_overrides
                    .into_iter()
                    .map(price_override_input)
                    .collect(),
                status: request.status.into(),
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(models.into_iter().map(ModelResponse::from).collect()),
    ))
}

pub(super) fn price_override_input(request: ModelPriceOverrideRequest) -> ModelPriceOverrideInput {
    ModelPriceOverrideInput {
        group: match request.group {
            ModelPriceGroupRequest::Base => ModelPriceGroupInput::Base,
            ModelPriceGroupRequest::ContextOver200k => ModelPriceGroupInput::ContextOver200k,
            ModelPriceGroupRequest::Tier { tier_type, size } => {
                ModelPriceGroupInput::Tier { tier_type, size }
            }
            ModelPriceGroupRequest::ExperimentalMode { mode } => {
                ModelPriceGroupInput::ExperimentalMode { mode }
            }
            ModelPriceGroupRequest::ExperimentalModeTier {
                mode,
                tier_type,
                size,
            } => ModelPriceGroupInput::ExperimentalModeTier {
                mode,
                tier_type,
                size,
            },
            ModelPriceGroupRequest::ServiceTier { tier } => {
                ModelPriceGroupInput::ServiceTier { tier }
            }
        },
        rate: request.rate,
        price: request.price.to_string(),
    }
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    payload: Result<Json<ModelStatusRequest>, JsonRejection>,
) -> Result<Json<ModelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .model_service
        .update_status(user.role, id, request.status.into())
        .await?;

    Ok(Json(ModelResponse::from(model)))
}

pub async fn delete_model(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    state.model_service.delete(user.role, id).await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_pricing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    payload: Result<Json<UpdateModelPricingRequest>, JsonRejection>,
) -> Result<Json<ModelResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .model_service
        .update_pricing(
            user.role,
            id,
            UpdateModelPricing {
                price_overrides: request
                    .price_overrides
                    .into_iter()
                    .map(price_override_input)
                    .collect(),
            },
        )
        .await?;

    Ok(Json(ModelResponse::from(model)))
}

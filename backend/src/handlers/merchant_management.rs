use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        BatchDeleteManagedMerchantsRequest, BatchDeleteManagedMerchantsResponse,
        BatchUpdateManagedMerchantStatusRequest, BatchUpdateManagedMerchantStatusResponse,
        ListManagedMerchantsQuery, ListMerchantRequestsQuery, ManagedMerchantResponse,
        MerchantChannelResponse, MerchantModelResponse, MerchantRequestResponse, PaginatedResponse,
        PaginationResponse, ReviewManagedMerchantRequest, UpdateManagedMerchantRequest,
        UpdateManagedMerchantStatusRequest, UpdateMerchantChannelStatusRequest,
        UpdateMerchantModelStatusRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{AdminMerchantModelLogQuery, ReviewManagedMerchant, UpdateManagedMerchant},
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListManagedMerchantsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<ManagedMerchantResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .merchant_management_service
        .list(
            requester.role,
            pagination,
            query.query,
            query.status.map(Into::into),
        )
        .await?;

    Ok(Json(PaginatedResponse {
        items: result
            .items
            .into_iter()
            .map(ManagedMerchantResponse::from)
            .collect(),
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn detail(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
) -> Result<Json<ManagedMerchantResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let merchant = state
        .merchant_management_service
        .get(requester.role, user_id)
        .await?;

    Ok(Json(ManagedMerchantResponse::from(merchant)))
}

pub async fn list_channels(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantChannelResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let channels = state
        .merchant_channel_service
        .list_for_admin(requester.role, user_id)
        .await?;

    Ok(Json(
        channels
            .into_iter()
            .map(MerchantChannelResponse::from)
            .collect(),
    ))
}

pub async fn latest_channel_operation(
    State(state): State<AppState>,
    Path((user_id, channel_id)): Path<(i64, String)>,
    headers: HeaderMap,
) -> Result<Json<Option<MerchantRequestResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let operation = state
        .merchant_request_service
        .latest_channel_operation_for_admin(requester.role, user_id, &channel_id)
        .await?;

    Ok(Json(operation.map(MerchantRequestResponse::from)))
}

pub async fn latest_model_operation(
    State(state): State<AppState>,
    Path((user_id, listing_id)): Path<(i64, String)>,
    headers: HeaderMap,
) -> Result<Json<Option<MerchantRequestResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let operation = state
        .merchant_request_service
        .latest_model_operation_for_admin(requester.role, user_id, &listing_id)
        .await?;

    Ok(Json(operation.map(MerchantRequestResponse::from)))
}

pub async fn list_models(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantModelResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let models = state
        .merchant_model_service
        .list_for_admin(requester.role, user_id)
        .await?;

    Ok(Json(
        models
            .into_iter()
            .map(MerchantModelResponse::from)
            .collect(),
    ))
}

pub async fn list_model_logs(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    query: Result<Query<ListMerchantRequestsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<MerchantRequestResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .merchant_request_service
        .list_model_logs_for_admin(
            requester.role,
            user_id,
            AdminMerchantModelLogQuery {
                pagination,
                query: query.query,
                sort_by: query.sort_by.into(),
                sort_order: query.sort_order.into(),
                status: query.status.map(Into::into),
            },
        )
        .await?;

    Ok(Json(PaginatedResponse {
        items: result
            .items
            .into_iter()
            .map(MerchantRequestResponse::from)
            .collect(),
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn update_channel_status(
    State(state): State<AppState>,
    Path((user_id, channel_id)): Path<(i64, String)>,
    headers: HeaderMap,
    payload: Result<Json<UpdateMerchantChannelStatusRequest>, JsonRejection>,
) -> Result<Json<MerchantChannelResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let channel = state
        .merchant_channel_service
        .update_status_for_admin(
            requester.id,
            requester.role,
            user_id,
            &channel_id,
            request.status.into(),
            request.reason,
        )
        .await?;

    Ok(Json(MerchantChannelResponse::from(channel)))
}

pub async fn update_model_status(
    State(state): State<AppState>,
    Path((user_id, listing_id)): Path<(i64, String)>,
    headers: HeaderMap,
    payload: Result<Json<UpdateMerchantModelStatusRequest>, JsonRejection>,
) -> Result<Json<MerchantModelResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let model = state
        .merchant_model_service
        .update_status_for_admin(
            requester.id,
            requester.role,
            user_id,
            &listing_id,
            request.status.into(),
            request.reason,
        )
        .await?;

    Ok(Json(MerchantModelResponse::from(model)))
}

pub async fn update(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    payload: Result<Json<UpdateManagedMerchantRequest>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    state
        .merchant_management_service
        .update(
            requester.role,
            user_id,
            UpdateManagedMerchant {
                name: request.name,
                email: request.email,
                concurrency_limit: request.concurrency_limit,
                rpm_limit: request.rpm_limit,
            },
        )
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn review(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    payload: Result<Json<ReviewManagedMerchantRequest>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    state
        .merchant_management_service
        .review(
            requester.id,
            requester.role,
            user_id,
            ReviewManagedMerchant {
                decision: request.decision.into(),
                review_note: request.review_note,
            },
        )
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_status(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    payload: Result<Json<UpdateManagedMerchantStatusRequest>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    state
        .merchant_management_service
        .update_status(requester.role, user_id, request.status.into())
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_status_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<BatchUpdateManagedMerchantStatusRequest>, JsonRejection>,
) -> Result<Json<BatchUpdateManagedMerchantStatusResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let updated_count = state
        .merchant_management_service
        .update_status_batch(requester.role, request.user_ids, request.status.into())
        .await?;

    Ok(Json(BatchUpdateManagedMerchantStatusResponse {
        updated_count,
    }))
}

pub async fn remove(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    state
        .merchant_management_service
        .remove(requester.role, user_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<BatchDeleteManagedMerchantsRequest>, JsonRejection>,
) -> Result<Json<BatchDeleteManagedMerchantsResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let deleted_count = state
        .merchant_management_service
        .remove_batch(requester.role, request.user_ids)
        .await?;

    Ok(Json(BatchDeleteManagedMerchantsResponse { deleted_count }))
}

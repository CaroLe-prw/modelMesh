use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        BatchDeleteManagedMerchantsRequest, BatchDeleteManagedMerchantsResponse,
        BatchUpdateManagedMerchantStatusRequest, BatchUpdateManagedMerchantStatusResponse,
        ListManagedMerchantsQuery, ManagedMerchantResponse, PaginatedResponse, PaginationResponse,
        ReviewManagedMerchantRequest, UpdateManagedMerchantRequest,
        UpdateManagedMerchantStatusRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{ReviewManagedMerchant, UpdateManagedMerchant},
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

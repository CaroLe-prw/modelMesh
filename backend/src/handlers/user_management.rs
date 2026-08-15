use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    domain::ManagedUserBalanceAdjustmentKind,
    dto::{
        AdjustManagedUserBalanceRequest, ApiKeyResponse, BatchDeleteManagedUsersRequest,
        BatchDeleteManagedUsersResponse, CreateManagedUserRequest, ListApiKeysQuery,
        ListManagedUserBalanceAdjustmentsQuery, ListManagedUsersQuery,
        ManagedUserBalanceAdjustmentListResponse, ManagedUserBalanceAdjustmentResponse,
        ManagedUserResponse, PaginatedResponse, PaginationResponse, UpdateManagedUserRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{CreateManagedUser, UpdateManagedUser},
    state::AppState,
};

pub async fn list_api_keys(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    query: Result<Query<ListApiKeysQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<ApiKeyResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .api_key_service
        .list_for_admin(
            requester.role,
            user_id,
            pagination,
            query.query,
            query.status.map(Into::into),
        )
        .await?;

    Ok(Json(PaginatedResponse {
        items: result.items.into_iter().map(ApiKeyResponse::from).collect(),
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListManagedUsersQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<ManagedUserResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let sort = query.sort();
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .user_management_service
        .list(
            requester.role,
            pagination,
            query.query,
            query.role.map(Into::into),
            query.status.map(Into::into),
            sort,
        )
        .await?;

    Ok(Json(PaginatedResponse {
        items: result
            .items
            .into_iter()
            .map(ManagedUserResponse::from)
            .collect(),
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateManagedUserRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<ManagedUserResponse>), AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let user = state
        .user_management_service
        .create(
            requester.id,
            requester.role,
            CreateManagedUser {
                email: request.email,
                password: request.password,
                username: request.username,
                role: request.role.into(),
                balance_microusd: request.balance_microusd,
                concurrency_limit: request.concurrency_limit,
                rpm_limit: request.rpm_limit,
            },
        )
        .await?;

    Ok((StatusCode::CREATED, Json(ManagedUserResponse::from(user))))
}

pub async fn list_balance_adjustments(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    query: Result<Query<ListManagedUserBalanceAdjustmentsQuery>, QueryRejection>,
) -> Result<Json<ManagedUserBalanceAdjustmentListResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .user_management_service
        .list_balance_adjustments(
            requester.role,
            user_id,
            pagination,
            query.adjustment_type.map(Into::into),
        )
        .await?;

    Ok(Json(ManagedUserBalanceAdjustmentListResponse {
        items: result
            .page
            .items
            .into_iter()
            .map(ManagedUserBalanceAdjustmentResponse::from)
            .collect(),
        pagination: PaginationResponse::new(result.page.pagination, result.page.total),
        total_deposited_microusd: result.total_deposited_microusd,
    }))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    payload: Result<Json<UpdateManagedUserRequest>, JsonRejection>,
) -> Result<Json<ManagedUserResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let user = state
        .user_management_service
        .update(
            requester.id,
            requester.role,
            user_id,
            UpdateManagedUser {
                email: request.email,
                password: request.password,
                username: request.username,
                notes: request.notes,
                role: request.role.into(),
                status: request.status.into(),
                concurrency_limit: request.concurrency_limit,
                rpm_limit: request.rpm_limit,
            },
        )
        .await?;

    Ok(Json(ManagedUserResponse::from(user)))
}

pub async fn delete_managed_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    state
        .user_management_service
        .delete(requester.id, requester.role, vec![user_id])
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn batch_delete_managed_users(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<BatchDeleteManagedUsersRequest>, JsonRejection>,
) -> Result<Json<BatchDeleteManagedUsersResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let deleted_count = state
        .user_management_service
        .delete(requester.id, requester.role, request.user_ids)
        .await?;

    Ok(Json(BatchDeleteManagedUsersResponse { deleted_count }))
}

pub async fn deposit(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    payload: Result<Json<AdjustManagedUserBalanceRequest>, JsonRejection>,
) -> Result<Json<ManagedUserResponse>, AppError> {
    adjust_balance(
        state,
        headers,
        user_id,
        payload,
        ManagedUserBalanceAdjustmentKind::Deposit,
    )
    .await
}

pub async fn refund(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    payload: Result<Json<AdjustManagedUserBalanceRequest>, JsonRejection>,
) -> Result<Json<ManagedUserResponse>, AppError> {
    adjust_balance(
        state,
        headers,
        user_id,
        payload,
        ManagedUserBalanceAdjustmentKind::Refund,
    )
    .await
}

async fn adjust_balance(
    state: AppState,
    headers: HeaderMap,
    user_id: i64,
    payload: Result<Json<AdjustManagedUserBalanceRequest>, JsonRejection>,
    adjustment: ManagedUserBalanceAdjustmentKind,
) -> Result<Json<ManagedUserResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let user = state
        .user_management_service
        .adjust_balance(
            requester.id,
            requester.role,
            user_id,
            request.amount_microusd,
            request.notes,
            adjustment,
        )
        .await?;

    Ok(Json(ManagedUserResponse::from(user)))
}

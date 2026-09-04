use axum::{
    Json,
    extract::{Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        CreateMerchantRequestRequest, ListMerchantRequestsQuery, MerchantRequestResponse,
        PaginatedResponse, PaginationResponse,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::CreateMerchantRequest,
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListMerchantRequestsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<MerchantRequestResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .merchant_request_service
        .list(
            user.id,
            user.role,
            pagination,
            query.query,
            query.status.map(Into::into),
            query.sort_by.into(),
            query.sort_order.into(),
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

pub async fn list_latest_channel_operations(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<MerchantRequestResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let operations = state
        .merchant_request_service
        .list_latest_channel_operations(user.id, user.role)
        .await?;

    Ok(Json(
        operations
            .into_iter()
            .map(MerchantRequestResponse::from)
            .collect(),
    ))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateMerchantRequestRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<MerchantRequestResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let request = state
        .merchant_request_service
        .create(
            user.id,
            user.role,
            CreateMerchantRequest {
                request_type: request.request_type.into(),
                subject: request.subject,
                description: request.description,
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(MerchantRequestResponse::from(request)),
    ))
}

use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        CatalogReviewConnectionTestResponse, CatalogReviewModelTestResponse, CatalogReviewResponse,
        ListCatalogReviewsQuery, PaginatedResponse, PaginationResponse, ReviewCatalogItemRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListCatalogReviewsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<CatalogReviewResponse>>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .catalog_review_service
        .list(
            requester.role,
            query.kind.into(),
            pagination,
            query.query,
            query.status.map(Into::into),
        )
        .await?;

    Ok(Json(PaginatedResponse {
        items: result
            .items
            .into_iter()
            .map(CatalogReviewResponse::from)
            .collect(),
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn test_connection(
    State(state): State<AppState>,
    Path(review_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<CatalogReviewConnectionTestResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let result = state
        .catalog_review_service
        .test_channel_connection(requester.id, requester.role, review_id)
        .await?;

    Ok(Json(result.into()))
}

pub async fn test_model(
    State(state): State<AppState>,
    Path(review_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<CatalogReviewModelTestResponse>, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let result = state
        .catalog_review_service
        .test_model(requester.id, requester.role, review_id)
        .await?;

    Ok(Json(result.into()))
}

pub async fn review(
    State(state): State<AppState>,
    Path(review_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<ReviewCatalogItemRequest>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    let requester = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    state
        .catalog_review_service
        .review(
            requester.id,
            requester.role,
            request.kind.into(),
            review_id,
            request.expected_status.into(),
            request.decision.into(),
            request.review_note,
        )
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

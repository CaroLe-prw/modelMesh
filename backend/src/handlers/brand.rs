use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        BrandResponse, BrandStatusRequest, CreateBrandRequest, ListBrandsQuery, PaginatedResponse,
        PaginationResponse, UpdateBrandRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{CreateBrand, UpdateBrand},
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ListBrandsQuery>, QueryRejection>,
) -> Result<Json<PaginatedResponse<BrandResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let pagination = query
        .pagination
        .try_into()
        .map_err(|()| AppError::InvalidRequest)?;
    let result = state
        .brand_service
        .list_page(
            user.role,
            pagination,
            query.query,
            query.status.map(Into::into),
        )
        .await?;
    let items = result.items.into_iter().map(BrandResponse::from).collect();

    Ok(Json(PaginatedResponse {
        items,
        pagination: PaginationResponse::new(result.pagination, result.total),
    }))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateBrandRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<BrandResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let brand = state
        .brand_service
        .create(
            user.role,
            CreateBrand {
                identifier: request.id,
                name: request.name,
                preset_identifier: request.preset_id,
                avatar_url: request.avatar_url,
                sort_order: request.sort_order,
                status: request.status.into(),
            },
        )
        .await?;

    Ok((StatusCode::CREATED, Json(BrandResponse::from(brand))))
}

pub async fn update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(identifier): Path<String>,
    payload: Result<Json<BrandStatusRequest>, JsonRejection>,
) -> Result<Json<BrandResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let brand = state
        .brand_service
        .update_status(user.role, identifier, request.status.into())
        .await?;

    Ok(Json(BrandResponse::from(brand)))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(identifier): Path<String>,
    payload: Result<Json<UpdateBrandRequest>, JsonRejection>,
) -> Result<Json<BrandResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let brand = state
        .brand_service
        .update(
            user.role,
            identifier,
            UpdateBrand {
                name: request.name,
                sort_order: request.sort_order,
            },
        )
        .await?;

    Ok(Json(BrandResponse::from(brand)))
}

pub async fn delete_brand(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(identifier): Path<String>,
) -> Result<StatusCode, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    state.brand_service.delete(user.role, identifier).await?;

    Ok(StatusCode::NO_CONTENT)
}

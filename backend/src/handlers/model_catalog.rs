use axum::{
    Json,
    extract::{Query, State, rejection::QueryRejection},
    http::HeaderMap,
};

use crate::{
    dto::{ModelCatalogEntryResponse, ModelCatalogListQuery, ModelCatalogLookupQuery},
    error::AppError,
    handlers::auth::authenticate_user,
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ModelCatalogListQuery>, QueryRejection>,
) -> Result<Json<Vec<ModelCatalogEntryResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let entries = state
        .model_catalog_service
        .list(user.role, query.brand_id)
        .await?;

    Ok(Json(
        entries
            .into_iter()
            .map(ModelCatalogEntryResponse::from)
            .collect(),
    ))
}

pub async fn lookup(
    State(state): State<AppState>,
    headers: HeaderMap,
    query: Result<Query<ModelCatalogLookupQuery>, QueryRejection>,
) -> Result<Json<ModelCatalogEntryResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let entry = state
        .model_catalog_service
        .lookup(user.role, query.brand_id, query.model_id)
        .await?;

    Ok(Json(ModelCatalogEntryResponse::from(entry)))
}

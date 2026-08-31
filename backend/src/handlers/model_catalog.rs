use axum::{
    Json,
    extract::{Query, State, rejection::QueryRejection},
    http::HeaderMap,
};

use crate::{
    dto::{
        BrandResponse, ModelCatalogEntryResponse, ModelCatalogListQuery, ModelCatalogLookupQuery,
        ModelCatalogOptionResponse, ModelCatalogOptionsResponse,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    state::AppState,
};

pub async fn options(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<ModelCatalogOptionsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let brands = state.brand_service.list(user.role, None, None).await?;
    let brand_identifiers = brands
        .iter()
        .map(|brand| brand.identifier.clone())
        .collect();
    let models_by_brand = state
        .model_catalog_service
        .list_options(user.role, brand_identifiers)
        .await?
        .into_iter()
        .map(|(brand_identifier, options)| {
            (
                brand_identifier,
                options
                    .into_iter()
                    .map(ModelCatalogOptionResponse::from)
                    .collect(),
            )
        })
        .collect();

    Ok(Json(ModelCatalogOptionsResponse {
        brands: brands.into_iter().map(BrandResponse::from).collect(),
        models_by_brand,
    }))
}

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

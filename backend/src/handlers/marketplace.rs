use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection, rejection::QueryRejection},
    http::HeaderMap,
};

use crate::{
    dto::{
        MarketplaceCatalogResponse, MarketplaceMerchantQuery, MarketplaceMerchantResponse,
        MarketplaceRouteStateResponse, UpdateMarketplaceRouteRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user_id,
    state::AppState,
};

pub async fn catalog(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MarketplaceCatalogResponse>, AppError> {
    authenticate_user_id(&state, &headers).await?;
    let catalog = state.marketplace_service.catalog().await?;

    Ok(Json(MarketplaceCatalogResponse::from(catalog)))
}

pub async fn merchants(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(model_id): Path<i64>,
    query: Result<Query<MarketplaceMerchantQuery>, QueryRejection>,
) -> Result<Json<Vec<MarketplaceMerchantResponse>>, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Query(query) = query.map_err(|_| AppError::InvalidRequest)?;
    let merchants = state
        .marketplace_service
        .merchants(user_id, model_id, query.api_key_id)
        .await?;

    Ok(Json(
        merchants
            .into_iter()
            .map(MarketplaceMerchantResponse::from)
            .collect(),
    ))
}

pub async fn update_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((api_key_id, model_id, merchant_id)): Path<(String, i64, String)>,
    payload: Result<Json<UpdateMarketplaceRouteRequest>, JsonRejection>,
) -> Result<Json<MarketplaceRouteStateResponse>, AppError> {
    let user_id = authenticate_user_id(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let route = state
        .marketplace_service
        .update_route(
            user_id,
            api_key_id,
            model_id,
            merchant_id,
            request.is_in_route,
            request.is_pinned,
        )
        .await?;

    Ok(Json(MarketplaceRouteStateResponse::from(route)))
}

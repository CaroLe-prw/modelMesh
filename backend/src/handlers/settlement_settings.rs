use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::HeaderMap,
};

use crate::{
    dto::{MerchantSettlementSettingsResponse, UpdateMerchantSettlementSettingsRequest},
    error::AppError,
    handlers::auth::authenticate_user,
    state::AppState,
};

pub async fn admin_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MerchantSettlementSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let settings = state
        .merchant_settlement_settings_service
        .get_for_admin(user.role)
        .await?;
    Ok(Json(MerchantSettlementSettingsResponse::from(settings)))
}

pub async fn admin_update(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<UpdateMerchantSettlementSettingsRequest>, JsonRejection>,
) -> Result<Json<MerchantSettlementSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let settings = state
        .merchant_settlement_settings_service
        .update(
            user.id,
            user.role,
            request
                .enabled_methods
                .into_iter()
                .map(Into::into)
                .collect(),
            request
                .enabled_networks
                .into_iter()
                .map(Into::into)
                .collect(),
        )
        .await?;
    Ok(Json(MerchantSettlementSettingsResponse::from(settings)))
}

pub async fn merchant_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MerchantSettlementSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let settings = state
        .merchant_settlement_settings_service
        .get_for_merchant(user.role)
        .await?;
    Ok(Json(MerchantSettlementSettingsResponse::from(settings)))
}

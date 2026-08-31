use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::HeaderMap,
};

use crate::{
    dto::{
        MerchantSettlementSettingsResponse, SystemSettingsResponse, UpdateSystemSettingsRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::UpdateSystemSettings,
    state::AppState,
};

pub async fn admin_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<SystemSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let settings = state
        .system_settings_service
        .get_for_admin(user.role)
        .await?;
    Ok(Json(SystemSettingsResponse::from(settings)))
}

pub async fn admin_update(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<UpdateSystemSettingsRequest>, JsonRejection>,
) -> Result<Json<SystemSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let settings = state
        .system_settings_service
        .update(
            user.id,
            user.role,
            UpdateSystemSettings {
                registration_enabled: request.registration_enabled,
                withdrawal_minimum_usd: request.finance.withdrawal_minimum_usd,
                withdrawal_fee_percent: request.finance.withdrawal_fee_percent,
                platform_fee_percent: request.finance.platform_fee_percent,
                enabled_methods: request
                    .settlement
                    .enabled_methods
                    .into_iter()
                    .map(Into::into)
                    .collect(),
                enabled_networks: request
                    .settlement
                    .enabled_networks
                    .into_iter()
                    .map(Into::into)
                    .collect(),
            },
        )
        .await?;
    Ok(Json(SystemSettingsResponse::from(settings)))
}

pub async fn merchant_get_settlement(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MerchantSettlementSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let settings = state
        .system_settings_service
        .get_for_merchant(user.role)
        .await?;
    Ok(Json(MerchantSettlementSettingsResponse::from(settings)))
}

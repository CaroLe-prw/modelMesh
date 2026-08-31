use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::HeaderMap,
};

use crate::{
    dto::{PriceSettingsResponse, UpdatePriceSettingsRequest},
    error::AppError,
    handlers::auth::authenticate_user,
    services::{PriceReviewPolicyInput, PriceSettingInput},
    state::AppState,
};

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<PriceSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let settings = state.price_settings_service.get(user.role).await?;
    Ok(Json(PriceSettingsResponse::from(settings)))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<UpdatePriceSettingsRequest>, JsonRejection>,
) -> Result<Json<PriceSettingsResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let settings = state
        .price_settings_service
        .update(
            user.role,
            request
                .rates
                .into_iter()
                .map(|rate| PriceSettingInput {
                    currency: rate.price_currency,
                    units_per_usd: rate.exchange_rate.to_string(),
                })
                .collect(),
            PriceReviewPolicyInput {
                approved_price_effective_delay_hours: request
                    .review_policy
                    .approved_price_effective_delay_hours,
                price_increase_review_threshold_percent: request
                    .review_policy
                    .price_increase_review_threshold_percent
                    .to_string(),
            },
        )
        .await?;
    Ok(Json(PriceSettingsResponse::from(settings)))
}

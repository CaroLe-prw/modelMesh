use axum::{
    Json,
    extract::{Path, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{
        CreateMerchantSettlementAccountRequest, MerchantProfileResponse,
        UpdateMerchantProfileRequest,
    },
    error::AppError,
    handlers::auth::authenticate_user,
    services::{CreateMerchantSettlementAccount, UpdateMerchantProfile},
    state::AppState,
};

pub async fn current(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MerchantProfileResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let profile = state
        .merchant_profile_service
        .current(user.id, user.role)
        .await?;
    Ok(Json(MerchantProfileResponse::from(profile)))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<UpdateMerchantProfileRequest>, JsonRejection>,
) -> Result<Json<MerchantProfileResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let profile = state
        .merchant_profile_service
        .update(
            user.id,
            user.role,
            UpdateMerchantProfile {
                business_name: request.business_name,
                website: request.website,
                industry: request.industry,
                contact_name: request.contact_name,
                contact_email: request.contact_email,
                contact_phone: request.contact_phone,
            },
        )
        .await?;
    Ok(Json(MerchantProfileResponse::from(profile)))
}

pub async fn create_settlement_account(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<CreateMerchantSettlementAccountRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<MerchantProfileResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let profile = state
        .merchant_profile_service
        .create_settlement_account(
            user.id,
            user.role,
            CreateMerchantSettlementAccount {
                entity_name: request.entity_name,
                method: request.method.into(),
                currency: request.currency.into(),
                network: request.network.map(Into::into),
                account: request.account,
            },
        )
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(MerchantProfileResponse::from(profile)),
    ))
}

pub async fn set_default_settlement_account(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(account_id): Path<String>,
) -> Result<Json<MerchantProfileResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let profile = state
        .merchant_profile_service
        .set_default_settlement_account(user.id, user.role, &account_id)
        .await?;
    Ok(Json(MerchantProfileResponse::from(profile)))
}

pub async fn delete_settlement_account(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(account_id): Path<String>,
) -> Result<Json<MerchantProfileResponse>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let profile = state
        .merchant_profile_service
        .delete_settlement_account(user.id, user.role, &account_id)
        .await?;
    Ok(Json(MerchantProfileResponse::from(profile)))
}

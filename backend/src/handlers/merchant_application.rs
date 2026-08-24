use axum::{
    Json,
    extract::{State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
};

use crate::{
    dto::{MerchantApplicationResponse, SubmitMerchantApplicationRequest},
    error::AppError,
    handlers::auth::authenticate_user,
    services::SubmitMerchantApplication,
    state::AppState,
};

pub async fn current(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Option<MerchantApplicationResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let application = state.merchant_application_service.current(user.id).await?;

    Ok(Json(application.map(|application| {
        MerchantApplicationResponse::new(application, user.role)
    })))
}

pub async fn submit(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<SubmitMerchantApplicationRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<MerchantApplicationResponse>), AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let Json(request) = payload.map_err(|_| AppError::InvalidRequest)?;
    let application = state
        .merchant_application_service
        .submit(
            user.id,
            user.role,
            SubmitMerchantApplication {
                business_name: request.business_name,
                avatar_url: request.avatar_url,
                website: request.website,
                description: request.description,
            },
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(MerchantApplicationResponse::new(application, user.role)),
    ))
}

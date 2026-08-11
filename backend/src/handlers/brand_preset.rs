use axum::{Json, extract::State, http::HeaderMap};

use crate::{
    dto::BrandPresetResponse, error::AppError, handlers::auth::authenticate_user, state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<BrandPresetResponse>>, AppError> {
    let user = authenticate_user(&state, &headers).await?;
    let presets = state.brand_preset_service.list(user.role).await?;

    Ok(Json(
        presets.into_iter().map(BrandPresetResponse::from).collect(),
    ))
}

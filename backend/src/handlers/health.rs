use axum::{Json, extract::State};

use crate::{
    dto::{DependencyStatus, HealthResponse, ReadinessResponse},
    error::AppError,
    pools::verify_database_connection,
    state::AppState,
};

pub async fn get_health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: state.service_name,
        version: state.version,
    })
}

pub async fn get_readiness(
    State(state): State<AppState>,
) -> Result<Json<ReadinessResponse>, AppError> {
    verify_database_connection(&state.database)
        .await
        .map_err(|_| AppError::DependencyUnavailable)?;
    state
        .redis
        .ping()
        .await
        .map_err(|_| AppError::DependencyUnavailable)?;

    Ok(Json(ReadinessResponse {
        status: "ready",
        dependencies: DependencyStatus {
            postgres: "ok",
            redis: "ok",
        },
    }))
}

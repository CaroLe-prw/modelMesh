use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

#[derive(Debug, Serialize)]
pub struct ReadinessResponse {
    pub status: &'static str,
    pub dependencies: DependencyStatus,
}

#[derive(Debug, Serialize)]
pub struct DependencyStatus {
    pub postgres: &'static str,
    pub redis: &'static str,
}

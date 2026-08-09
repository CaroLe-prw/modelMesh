mod clients;
mod config;
mod domain;
mod dto;
mod entity;
mod error;
mod handlers;
mod logging;
mod migration;
mod pools;
mod redis_key;
mod repository;
mod routes;
mod security;
mod services;
mod state;

use clients::RedisClient;
use config::AppConfig;
use pools::{create_database_connection, create_redis_pool, verify_database_connection};
use routes::create_router;
use sea_orm_migration::MigratorTrait;
use state::AppState;
use std::{path::PathBuf, process::ExitCode};

struct StartupError {
    stage: &'static str,
}

#[tokio::main]
async fn main() -> Result<ExitCode, Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    dotenvy::from_path(manifest_dir.join(".env")).ok();

    let config = AppConfig::from_env()?;
    let _logging_guard = logging::initialize(&config, &manifest_dir)?;
    tracing::info!(
        environment = config.environment.as_str(),
        log_filter = %config.log_filter,
        "logging initialized"
    );

    if let Err(error) = run(config).await {
        tracing::error!(
            startup_stage = error.stage,
            "backend stopped after a fatal error"
        );
        return Ok(ExitCode::FAILURE);
    }

    Ok(ExitCode::SUCCESS)
}

async fn run(config: AppConfig) -> Result<(), StartupError> {
    let database = create_database_connection(&config)
        .await
        .map_err(startup_error("database_connection_create"))?;
    let redis_pool = create_redis_pool(&config).map_err(startup_error("redis_pool_create"))?;
    let redis = RedisClient::new(redis_pool);
    verify_database_connection(&database)
        .await
        .map_err(startup_error("database_verify"))?;
    tracing::info!("PostgreSQL connection verified");
    redis.ping().await.map_err(startup_error("redis_verify"))?;
    tracing::info!("Redis connection verified");

    migration::Migrator::up(&database, None)
        .await
        .map_err(startup_error("migrations_run"))?;
    tracing::info!("database migrations completed");

    let listener = tokio::net::TcpListener::bind(config.bind_address)
        .await
        .map_err(startup_error("server_bind"))?;
    let state = AppState::new(database, redis, config.access_token_ttl_seconds);
    let app = create_router(state);

    tracing::info!(
        bind_address = %config.bind_address,
        "ModelMesh backend listening"
    );

    axum::serve(listener, app)
        .await
        .map_err(startup_error("server_serve"))?;

    Ok(())
}

fn startup_error<E>(stage: &'static str) -> impl FnOnce(E) -> StartupError {
    move |_| StartupError { stage }
}

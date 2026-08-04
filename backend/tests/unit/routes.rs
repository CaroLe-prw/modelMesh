use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use tower::ServiceExt;

use super::create_router;
use crate::state::AppState;

#[tokio::test]
async fn health_route_returns_service_status() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .expect("test request should be valid"),
        )
        .await
        .expect("health request should complete");

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), 1024)
        .await
        .expect("health response body should be readable");
    let body = String::from_utf8(body.to_vec()).expect("health response should be UTF-8");

    assert!(body.contains("\"status\":\"ok\""));
    assert!(body.contains("\"service\":\"modelmesh-backend\""));
}

#[tokio::test]
async fn current_user_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/auth/me")
                .body(Body::empty())
                .expect("test request should be valid"),
        )
        .await
        .expect("account request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn register_rejects_invalid_json_with_a_stable_error_code() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from("{"))
                .expect("test request should be valid"),
        )
        .await
        .expect("register request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(response_body(response).await, r#"{"error":{"code":10001}}"#);
}

fn test_router() -> Router {
    create_router(AppState::for_test())
}

async fn response_body(response: axum::response::Response) -> String {
    let body = to_bytes(response.into_body(), 1024)
        .await
        .expect("response body should be readable");

    String::from_utf8(body.to_vec()).expect("response should be UTF-8")
}

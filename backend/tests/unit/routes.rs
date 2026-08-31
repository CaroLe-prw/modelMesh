use axum::{
    Json, Router,
    body::{Body, to_bytes},
    extract::Query,
    http::{Request, StatusCode},
    routing::get,
};
use tower::ServiceExt;

use super::create_router;
use crate::state::AppState;
use crate::{
    domain::{ApiKey, ApiKeyStatus, Pagination},
    dto::{ApiKeyResponse, ListApiKeysQuery, PaginatedResponse, PaginationResponse},
};

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
async fn api_keys_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/api-keys")
                .body(Body::empty())
                .expect("test request should be valid"),
        )
        .await
        .expect("API key request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn account_routes_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/account-routes")
                .body(Body::empty())
                .expect("test request should be valid"),
        )
        .await
        .expect("account routes request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_application_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant-application")
                .body(Body::empty())
                .expect("merchant application request should be valid"),
        )
        .await
        .expect("merchant application request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_channels_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/channels")
                .body(Body::empty())
                .expect("merchant channel request should be valid"),
        )
        .await
        .expect("merchant channel request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_channel_providers_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/channel-providers")
                .body(Body::empty())
                .expect("merchant channel provider request should be valid"),
        )
        .await
        .expect("merchant channel provider request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_channel_model_discovery_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/merchant/channels/discover-models")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"baseUrl":"https://api.example.com/v1","providerId":"openai","apiKey":"secret"}"#,
                ))
                .expect("merchant channel discovery request should be valid"),
        )
        .await
        .expect("merchant channel discovery request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_models_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/models")
                .body(Body::empty())
                .expect("merchant model request should be valid"),
        )
        .await
        .expect("merchant model request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_requests_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/requests")
                .body(Body::empty())
                .expect("merchant request should be valid"),
        )
        .await
        .expect("merchant request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_profile_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/profile")
                .body(Body::empty())
                .expect("merchant profile request should be valid"),
        )
        .await
        .expect("merchant profile request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_settlement_settings_require_a_bearer_token() {
    for uri in [
        "/api/merchant/settlement-settings",
        "/api/admin/settlement-settings",
    ] {
        let response = test_router()
            .oneshot(
                Request::builder()
                    .uri(uri)
                    .body(Body::empty())
                    .expect("settlement settings request should be valid"),
            )
            .await
            .expect("settlement settings request should complete");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
    }
}

#[tokio::test]
async fn merchant_model_status_updates_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/merchant/models/00000000-0000-4000-8000-000000000001/status")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"status":"offline"}"#))
                .expect("merchant model status request should be valid"),
        )
        .await
        .expect("merchant model status request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn merchant_model_options_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/merchant/model-options?channelId=00000000-0000-4000-8000-000000000001")
                .body(Body::empty())
                .expect("merchant model option request should be valid"),
        )
        .await
        .expect("merchant model option request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn price_settings_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/price-settings")
                .body(Body::empty())
                .expect("price settings request should be valid"),
        )
        .await
        .expect("price settings request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn catalog_reviews_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/catalog-reviews?kind=channel")
                .body(Body::empty())
                .expect("catalog review request should be valid"),
        )
        .await
        .expect("catalog review request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn catalog_review_connection_test_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(
                    "/api/admin/catalog-reviews/00000000-0000-4000-8000-000000000001/test-connection",
                )
                .body(Body::empty())
                .expect("catalog review connection request should be valid"),
        )
        .await
        .expect("catalog review connection request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn catalog_review_model_test_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/catalog-reviews/00000000-0000-4000-8000-000000000001/test-model")
                .body(Body::empty())
                .expect("catalog review model test request should be valid"),
        )
        .await
        .expect("catalog review model test request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn brand_presets_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/brand-presets")
                .body(Body::empty())
                .expect("test request should be valid"),
        )
        .await
        .expect("brand preset request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn brands_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/brands")
                .body(Body::empty())
                .expect("brand request should be valid"),
        )
        .await
        .expect("brand request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_catalog_lookup_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/model-catalog/lookup?brandId=openai&modelId=gpt-5")
                .body(Body::empty())
                .expect("model catalog request should be valid"),
        )
        .await
        .expect("model catalog request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_catalog_list_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/model-catalog?brandId=openai")
                .body(Body::empty())
                .expect("model catalog list request should be valid"),
        )
        .await
        .expect("model catalog list request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_catalog_options_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/model-catalog/options")
                .body(Body::empty())
                .expect("model catalog option request should be valid"),
        )
        .await
        .expect("model catalog option request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn models_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/models")
                .body(Body::empty())
                .expect("model request should be valid"),
        )
        .await
        .expect("model request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_users_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/users")
                .body(Body::empty())
                .expect("managed users request should be valid"),
        )
        .await
        .expect("managed users request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchants_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/merchants?page=1&pageSize=20")
                .body(Body::empty())
                .expect("managed merchants request should be valid"),
        )
        .await
        .expect("managed merchants request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_update_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/api/admin/merchants/47")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"name":"Northstar AI","email":"ops@northstar.example"}"#,
                ))
                .expect("managed merchant update request should be valid"),
        )
        .await
        .expect("managed merchant update request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_review_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/merchants/47/review")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"decision":"approved","reviewNote":"verified"}"#,
                ))
                .expect("managed merchant review request should be valid"),
        )
        .await
        .expect("managed merchant review request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_status_update_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/api/admin/merchants/47/status")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"status":"disabled"}"#))
                .expect("managed merchant status request should be valid"),
        )
        .await
        .expect("managed merchant status request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_batch_status_update_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/api/admin/merchants/batch-status")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"userIds":[47,48],"status":"disabled"}"#))
                .expect("managed merchant batch status request should be valid"),
        )
        .await
        .expect("managed merchant batch status request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_batch_removal_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/merchants/batch-delete")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"userIds":[47,48]}"#))
                .expect("managed merchant batch removal request should be valid"),
        )
        .await
        .expect("managed merchant batch removal request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_merchant_removal_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/admin/merchants/47")
                .body(Body::empty())
                .expect("managed merchant removal request should be valid"),
        )
        .await
        .expect("managed merchant removal request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_creation_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/users")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"email":"user@example.com","password":"strong-password","role":"personal","balanceMicrousd":0,"concurrencyLimit":1,"rpmLimit":0}"#,
                ))
                .expect("managed user creation request should be valid"),
        )
        .await
        .expect("managed user creation request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_updates_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/admin/users/42")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"role":"personal","status":"active","concurrencyLimit":100000,"rpmLimit":0}"#,
                ))
                .expect("managed user update request should be valid"),
        )
        .await
        .expect("managed user update request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_deletion_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/admin/users/42")
                .body(Body::empty())
                .expect("managed user deletion request should be valid"),
        )
        .await
        .expect("managed user deletion request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_batch_deletion_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/users/batch-delete")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"userIds":[41,42]}"#))
                .expect("managed user batch deletion request should be valid"),
        )
        .await
        .expect("managed user batch deletion request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_api_keys_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/users/42/api-keys")
                .body(Body::empty())
                .expect("managed user API key request should be valid"),
        )
        .await
        .expect("managed user API key request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_balance_adjustments_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .uri("/api/admin/users/42/balance-adjustments?page=1&pageSize=20")
                .body(Body::empty())
                .expect("managed user balance adjustment request should be valid"),
        )
        .await
        .expect("managed user balance adjustment request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_deposits_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/users/42/deposit")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"amountMicrousd":1000000,"notes":"manual"}"#))
                .expect("managed user deposit request should be valid"),
        )
        .await
        .expect("managed user deposit request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn managed_user_refunds_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/users/42/refund")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"amountMicrousd":1000000,"notes":"manual"}"#))
                .expect("managed user refund request should be valid"),
        )
        .await
        .expect("managed user refund request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_creation_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/models")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"brandId":"openai","identifier":"gpt-5","status":"published"}"#,
                ))
                .expect("model creation request should be valid"),
        )
        .await
        .expect("model creation request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_batch_creation_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/models/batch")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"brandId":"openai","modelIds":["gpt-5"],"status":"published"}"#,
                ))
                .expect("model batch creation request should be valid"),
        )
        .await
        .expect("model batch creation request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_deletion_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/admin/models/42")
                .body(Body::empty())
                .expect("model deletion request should be valid"),
        )
        .await
        .expect("model deletion request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn model_pricing_updates_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/admin/models/42")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"priceOverrides":[]}"#))
                .expect("model pricing update request should be valid"),
        )
        .await
        .expect("model pricing update request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn brand_updates_require_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/admin/brands/openai")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"OpenAI","sortOrder":10}"#))
                .expect("brand update request should be valid"),
        )
        .await
        .expect("brand update request should complete");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_body(response).await, r#"{"error":{"code":11005}}"#);
}

#[tokio::test]
async fn brand_deletion_requires_a_bearer_token() {
    let response = test_router()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/admin/brands/openai")
                .body(Body::empty())
                .expect("brand deletion request should be valid"),
        )
        .await
        .expect("brand deletion request should complete");

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

#[tokio::test]
async fn pagination_query_uses_camel_case_and_defaults() {
    let router = Router::new().route("/pagination", get(pagination_probe));
    let explicit = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/pagination?page=3&pageSize=40&query=codex&status=active")
                .body(Body::empty())
                .expect("pagination request should be valid"),
        )
        .await
        .expect("pagination request should complete");
    let defaults = router
        .oneshot(
            Request::builder()
                .uri("/pagination")
                .body(Body::empty())
                .expect("default pagination request should be valid"),
        )
        .await
        .expect("default pagination request should complete");

    assert_eq!(response_body(explicit).await, "3:40:codex:active");
    assert_eq!(response_body(defaults).await, "1:20::all");
}

#[tokio::test]
async fn paginated_response_uses_shared_envelope() {
    let response = Router::new()
        .route("/pagination", get(pagination_response_probe))
        .oneshot(
            Request::builder()
                .uri("/pagination")
                .body(Body::empty())
                .expect("pagination response request should be valid"),
        )
        .await
        .expect("pagination response request should complete");

    assert_eq!(
        response_body(response).await,
        r#"{"items":["first"],"pagination":{"page":2,"pageSize":20,"total":21,"totalPages":2}}"#
    );
}

#[tokio::test]
async fn api_key_timestamps_are_serialized_as_utc_instants() {
    let response = Router::new()
        .route("/api-key", get(api_key_timestamp_probe))
        .oneshot(
            Request::builder()
                .uri("/api-key")
                .body(Body::empty())
                .expect("API key timestamp request should be valid"),
        )
        .await
        .expect("API key timestamp request should complete");
    let body = response_body(response).await;

    assert!(body.contains(r#""expiresAt":"2026-09-01T12:30:00Z""#));
    assert!(body.contains(r#""lastUsedAt":"2026-08-07T05:15:00Z""#));
    assert!(body.contains(r#""lastUsedIp":"203.0.113.10""#));
    assert!(body.contains(r#""createdAt":"2026-08-07T03:45:12Z""#));
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

async fn pagination_probe(Query(query): Query<ListApiKeysQuery>) -> String {
    let status: Option<ApiKeyStatus> = query.status.map(Into::into);
    let status = status.map_or("all", ApiKeyStatus::as_str);

    format!(
        "{}:{}:{}:{}",
        query.pagination.page,
        query.pagination.page_size,
        query.query.unwrap_or_default(),
        status,
    )
}

async fn pagination_response_probe() -> Json<PaginatedResponse<&'static str>> {
    let pagination = Pagination::new(2, 20).expect("test pagination should be valid");

    Json(PaginatedResponse {
        items: vec!["first"],
        pagination: PaginationResponse::new(pagination, 21),
    })
}

async fn api_key_timestamp_probe() -> Json<ApiKeyResponse> {
    Json(ApiKeyResponse::from(ApiKey {
        id: "00000000-0000-4000-8000-000000000001".to_owned(),
        name: "timestamp-test".to_owned(),
        key_prefix: "sk-abcd".to_owned(),
        key_suffix: "1234".to_owned(),
        status: ApiKeyStatus::Active,
        ip_restriction_enabled: false,
        ip_whitelist: String::new(),
        ip_blacklist: String::new(),
        quota_limit_microusd: 0,
        rate_limit_enabled: false,
        five_hour_limit_microusd: 0,
        daily_limit_microusd: 0,
        weekly_limit_microusd: 0,
        expires_at: Some(
            "2026-09-01T12:30:00Z"
                .parse()
                .expect("expiration should be valid"),
        ),
        last_used_at: Some(
            "2026-08-07T05:15:00Z"
                .parse()
                .expect("last usage time should be valid"),
        ),
        last_used_ip: Some("203.0.113.10".to_owned()),
        created_at: "2026-08-07T03:45:12Z"
            .parse()
            .expect("creation time should be valid"),
    }))
}

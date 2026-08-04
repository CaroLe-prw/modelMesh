use axum::http::{HeaderMap, HeaderValue, header::AUTHORIZATION};

use super::bearer_token;

const ACCESS_TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

#[test]
fn bearer_token_is_read_from_authorization_header() {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_static(
            "Bearer 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        ),
    );

    assert_eq!(bearer_token(&headers), Some(ACCESS_TOKEN));
}

#[test]
fn bearer_token_rejects_other_authorization_schemes() {
    let mut headers = HeaderMap::new();
    headers.insert(AUTHORIZATION, HeaderValue::from_static("Basic credentials"));

    assert_eq!(bearer_token(&headers), None);
}

#[test]
fn bearer_token_rejects_invalid_token_format() {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_static("Bearer short-token"),
    );

    assert_eq!(bearer_token(&headers), None);
}

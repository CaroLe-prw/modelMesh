use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use super::{ModelItem, ModelsResponse, UpstreamModelsClientError, models_url, normalize_models};
use crate::clients::upstream_http::{is_public_upstream_ip, non_public_address_kind};

#[test]
fn model_endpoint_is_appended_to_the_configured_api_prefix() {
    assert_eq!(
        models_url("https://api.example.com/v1")
            .expect("base URL should be valid")
            .as_str(),
        "https://api.example.com/v1/models"
    );
    assert_eq!(
        models_url("http://api.example.com/v1"),
        Err(UpstreamModelsClientError::InvalidBaseUrl)
    );
}

#[test]
fn discovered_models_are_trimmed_sorted_and_deduplicated() {
    let models = normalize_models(ModelsResponse::Data {
        data: vec![
            ModelItem {
                id: Some(" gpt-5 ".to_owned()),
                name: None,
            },
            ModelItem {
                id: Some("gpt-4.1".to_owned()),
                name: None,
            },
            ModelItem {
                id: Some("gpt-5".to_owned()),
                name: None,
            },
        ],
    })
    .expect("valid model data should normalize");

    assert_eq!(models, vec!["gpt-4.1", "gpt-5"]);
}

#[test]
fn private_and_documentation_addresses_are_rejected() {
    for address in [
        IpAddr::V4(Ipv4Addr::LOCALHOST),
        IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1)),
        IpAddr::V4(Ipv4Addr::new(198, 18, 15, 35)),
        IpAddr::V4(Ipv4Addr::new(192, 0, 2, 1)),
        IpAddr::V6(Ipv6Addr::LOCALHOST),
        IpAddr::V6("2001:db8::1".parse().expect("test IPv6 should parse")),
    ] {
        assert!(!is_public_upstream_ip(address), "{address}");
    }
    assert!(is_public_upstream_ip(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
    assert_eq!(
        non_public_address_kind(IpAddr::V4(Ipv4Addr::new(198, 18, 15, 35))),
        Some("benchmarking")
    );
}

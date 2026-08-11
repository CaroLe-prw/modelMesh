use std::{collections::HashMap, future::ready, time::Duration};

use super::{ModelsDevProvider, catalog_entries, retry_operation};

#[test]
fn models_dev_payload_keeps_context_and_per_million_prices() {
    let providers = serde_json::from_str::<HashMap<String, ModelsDevProvider>>(
        r#"{
            "openai": {
                "id": "openai",
                "name": "OpenAI",
                "models": {
                    "gpt-test": {
                        "id": "gpt-test",
                        "name": "GPT Test",
                        "limit": { "context": 128000 },
                        "cost": {
                            "input": 1.25,
                            "output": 10.0,
                            "reasoning": 10.0,
                            "cache_read": 0.125,
                            "cache_write": 1.5,
                            "input_audio": 2.0,
                            "output_audio": 20.0,
                            "context_over_200k": { "input": 2.5, "output": 15.0 },
                            "tiers": [{
                                "input": 3.0,
                                "output": 18.0,
                                "tier": { "type": "context", "size": 272000 }
                            }]
                        },
                        "experimental": {
                            "modes": {
                                "fast": { "cost": { "input": 2.5, "output": 20.0 } }
                            }
                        }
                    }
                }
            }
        }"#,
    )
    .expect("fixture should match the models.dev payload");
    let entries = catalog_entries(providers);

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].provider_id, "openai");
    assert_eq!(entries[0].model_id, "gpt-test");
    assert_eq!(entries[0].model_name, "GPT Test");
    assert_eq!(entries[0].context_window, Some(128_000));
    assert_eq!(entries[0].cache_read_price_usd_per_million, Some(0.125));
    assert_eq!(entries[0].cache_write_price_usd_per_million, Some(1.5));
    assert_eq!(entries[0].input_price_usd_per_million, Some(1.25));
    assert_eq!(entries[0].output_price_usd_per_million, Some(10.0));
    assert_eq!(
        entries[0]
            .raw_cost
            .as_ref()
            .and_then(|cost| cost.pointer("/tiers/0/tier/size"))
            .and_then(serde_json::Value::as_i64),
        Some(272_000)
    );
    assert_eq!(
        entries[0]
            .source_data
            .pointer("/experimental/modes/fast/cost/output")
            .and_then(serde_json::Value::as_f64),
        Some(20.0)
    );
}

#[test]
fn models_dev_payload_allows_models_without_pricing() {
    let providers = serde_json::from_str::<HashMap<String, ModelsDevProvider>>(
        r#"{
            "provider": {
                "id": "provider",
                "models": {
                    "free-model": { "id": "free-model", "name": "Free Model" }
                }
            }
        }"#,
    )
    .expect("fixture should allow optional metadata");
    let entries = catalog_entries(providers);

    assert_eq!(entries[0].context_window, None);
    assert_eq!(entries[0].cache_read_price_usd_per_million, None);
    assert_eq!(entries[0].cache_write_price_usd_per_million, None);
    assert_eq!(entries[0].input_price_usd_per_million, None);
    assert_eq!(entries[0].output_price_usd_per_million, None);
}

#[tokio::test]
async fn models_dev_client_retries_transient_server_failures() {
    let mut outcomes = [
        Err(TestRequestError::Transient),
        Err(TestRequestError::Transient),
        Ok("catalog"),
    ]
    .into_iter();
    let mut retries = Vec::new();

    let catalog = retry_operation(
        3,
        Duration::ZERO,
        || ready(outcomes.next().expect("one outcome per attempt")),
        |error| *error == TestRequestError::Transient,
        |attempt, max_attempts, delay, _| retries.push((attempt, max_attempts, delay)),
    )
    .await
    .expect("third request should succeed");

    assert_eq!(catalog, "catalog");
    assert_eq!(retries, [(1, 3, Duration::ZERO), (2, 3, Duration::ZERO),]);
}

#[tokio::test]
async fn models_dev_client_does_not_retry_client_errors() {
    let mut attempts = 0;
    let error = retry_operation(
        3,
        Duration::ZERO,
        || {
            attempts += 1;
            ready(Err::<(), _>(TestRequestError::Permanent))
        },
        |error| *error == TestRequestError::Transient,
        |_, _, _, _| panic!("permanent errors must not retry"),
    )
    .await
    .expect_err("permanent response should fail");

    assert_eq!(error.attempts, 1);
    assert_eq!(error.source, TestRequestError::Permanent);
    assert_eq!(attempts, 1);
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TestRequestError {
    Transient,
    Permanent,
}

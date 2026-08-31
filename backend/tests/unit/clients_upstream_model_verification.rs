use super::{
    InferenceMessage, InferenceProtocol, InferenceRole, UpstreamInferenceRequest,
    inference_endpoint, inference_payload, parse_inference_response,
};

#[test]
fn inference_endpoint_uses_the_provider_protocol() {
    assert_eq!(
        inference_endpoint(
            "https://api.example.com/v1",
            InferenceProtocol::OpenAiCompatible,
            "gpt-test",
        )
        .expect("OpenAI-compatible endpoint should be valid")
        .as_str(),
        "https://api.example.com/v1/chat/completions"
    );
    assert_eq!(
        inference_endpoint(
            "https://generativelanguage.googleapis.com/v1beta",
            InferenceProtocol::Google,
            "gemini-test",
        )
        .expect("Google endpoint should be valid")
        .as_str(),
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
    );
}

#[test]
fn openai_response_extracts_content_identity_and_usage() {
    let result = parse_inference_response(
        InferenceProtocol::OpenAiCompatible,
        br#"{
          "model":"gpt-test",
          "system_fingerprint":"fp_123",
          "choices":[{"finish_reason":"stop","message":{"content":"{\"result\":42}"}}],
          "usage":{"prompt_tokens":20,"completion_tokens":8}
        }"#,
    )
    .expect("response should parse");

    assert_eq!(result.content, "{\"result\":42}");
    assert_eq!(result.model.as_deref(), Some("gpt-test"));
    assert_eq!(result.input_tokens, Some(20));
    assert_eq!(result.output_tokens, Some(8));
    assert_eq!(result.system_fingerprint.as_deref(), Some("fp_123"));
}

#[test]
fn provider_payload_includes_system_and_conversation_messages() {
    let payload = inference_payload(
        InferenceProtocol::Anthropic,
        "anthropic",
        &UpstreamInferenceRequest {
            messages: vec![
                InferenceMessage {
                    content: "first".to_owned(),
                    role: InferenceRole::User,
                },
                InferenceMessage {
                    content: "second".to_owned(),
                    role: InferenceRole::Assistant,
                },
            ],
            model: "claude-test".to_owned(),
            system_prompt: "system".to_owned(),
        },
    );

    assert_eq!(payload["system"], "system");
    assert_eq!(payload["messages"][0]["role"], "user");
    assert_eq!(payload["messages"][1]["role"], "assistant");
}

#[test]
fn openai_payload_uses_the_current_completion_limit_field() {
    let payload = inference_payload(
        InferenceProtocol::OpenAiCompatible,
        "openai",
        &UpstreamInferenceRequest {
            messages: vec![InferenceMessage {
                content: "test".to_owned(),
                role: InferenceRole::User,
            }],
            model: "gpt-test".to_owned(),
            system_prompt: "system".to_owned(),
        },
    );

    assert_eq!(payload["max_completion_tokens"], 256);
    assert!(payload.get("max_tokens").is_none());
}

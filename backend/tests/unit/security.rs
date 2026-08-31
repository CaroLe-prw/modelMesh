use super::{CredentialCipher, CredentialCipherError, derive_credential_key, hash_secret};

#[test]
fn secret_is_sha256_encoded_as_lower_hex() {
    assert_eq!(
        hash_secret("abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn provider_credentials_are_encrypted_with_context_binding() {
    let cipher = CredentialCipher::new(derive_credential_key(
        "test-provider-credential-secret-with-enough-entropy",
    ));
    let first = cipher
        .encrypt("sk-provider-secret", "channel-a")
        .expect("credential encryption should succeed");
    let second = cipher
        .encrypt("sk-provider-secret", "channel-a")
        .expect("credential encryption should succeed");

    assert_ne!(first, second);
    assert!(!first.contains("sk-provider-secret"));
    assert_eq!(
        cipher
            .decrypt(&first, "channel-a")
            .expect("credential should decrypt in its original context"),
        "sk-provider-secret"
    );
    assert_eq!(
        cipher.decrypt(&first, "channel-b"),
        Err(CredentialCipherError::Decryption)
    );
}

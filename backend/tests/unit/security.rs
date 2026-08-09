use super::hash_secret;

#[test]
fn secret_is_sha256_encoded_as_lower_hex() {
    assert_eq!(
        hash_secret("abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

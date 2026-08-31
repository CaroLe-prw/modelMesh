use ring::{
    aead::{AES_256_GCM, Aad, LessSafeKey, Nonce, UnboundKey},
    rand::{SecureRandom, SystemRandom},
};
use sha2::{Digest, Sha256};

const CREDENTIAL_ENVELOPE_VERSION: &str = "v1";
const CREDENTIAL_NONCE_LENGTH: usize = 12;

#[derive(Clone)]
pub struct CredentialCipher {
    key: LessSafeKey,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CredentialCipherError {
    Decryption,
    Encryption,
    InvalidEnvelope,
}

impl CredentialCipher {
    pub fn new(key_bytes: [u8; 32]) -> Self {
        let key = UnboundKey::new(&AES_256_GCM, &key_bytes)
            .expect("a 32-byte provider credential key must be valid for AES-256-GCM");
        Self {
            key: LessSafeKey::new(key),
        }
    }

    pub fn encrypt(&self, plaintext: &str, context: &str) -> Result<String, CredentialCipherError> {
        let mut nonce_bytes = [0_u8; CREDENTIAL_NONCE_LENGTH];
        SystemRandom::new()
            .fill(&mut nonce_bytes)
            .map_err(|_| CredentialCipherError::Encryption)?;
        let mut ciphertext = plaintext.as_bytes().to_vec();
        self.key
            .seal_in_place_append_tag(
                Nonce::assume_unique_for_key(nonce_bytes),
                Aad::from(context.as_bytes()),
                &mut ciphertext,
            )
            .map_err(|_| CredentialCipherError::Encryption)?;

        Ok(format!(
            "{CREDENTIAL_ENVELOPE_VERSION}.{}.{}",
            encode_lower_hex(&nonce_bytes),
            encode_lower_hex(&ciphertext)
        ))
    }

    pub fn decrypt(&self, envelope: &str, context: &str) -> Result<String, CredentialCipherError> {
        let mut segments = envelope.split('.');
        let version = segments.next();
        let nonce = segments.next();
        let ciphertext = segments.next();
        if version != Some(CREDENTIAL_ENVELOPE_VERSION)
            || nonce.is_none()
            || ciphertext.is_none()
            || segments.next().is_some()
        {
            return Err(CredentialCipherError::InvalidEnvelope);
        }
        let nonce = decode_hex(nonce.unwrap_or_default())?;
        let nonce: [u8; CREDENTIAL_NONCE_LENGTH] = nonce
            .try_into()
            .map_err(|_| CredentialCipherError::InvalidEnvelope)?;
        let mut ciphertext = decode_hex(ciphertext.unwrap_or_default())?;
        let plaintext = self
            .key
            .open_in_place(
                Nonce::assume_unique_for_key(nonce),
                Aad::from(context.as_bytes()),
                &mut ciphertext,
            )
            .map_err(|_| CredentialCipherError::Decryption)?;

        String::from_utf8(plaintext.to_vec()).map_err(|_| CredentialCipherError::Decryption)
    }
}

pub fn derive_credential_key(secret: &str) -> [u8; 32] {
    let digest = Sha256::digest(secret.as_bytes());
    let mut key = [0_u8; 32];
    key.copy_from_slice(digest.as_ref());
    key
}

pub fn hash_secret(secret: &str) -> String {
    let digest = Sha256::digest(secret.as_bytes());
    encode_lower_hex(digest.as_ref())
}

fn encode_lower_hex(bytes: &[u8]) -> String {
    const HEX_DIGITS: &[u8; 16] = b"0123456789abcdef";

    let mut encoded = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        encoded.push(char::from(HEX_DIGITS[usize::from(byte >> 4)]));
        encoded.push(char::from(HEX_DIGITS[usize::from(byte & 0x0f)]));
    }

    encoded
}

fn decode_hex(value: &str) -> Result<Vec<u8>, CredentialCipherError> {
    if !value.len().is_multiple_of(2) {
        return Err(CredentialCipherError::InvalidEnvelope);
    }

    value
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let high = decode_hex_digit(pair[0])?;
            let low = decode_hex_digit(pair[1])?;
            Ok((high << 4) | low)
        })
        .collect()
}

fn decode_hex_digit(value: u8) -> Result<u8, CredentialCipherError> {
    match value {
        b'0'..=b'9' => Ok(value - b'0'),
        b'a'..=b'f' => Ok(value - b'a' + 10),
        _ => Err(CredentialCipherError::InvalidEnvelope),
    }
}

#[cfg(test)]
#[path = "../tests/unit/security.rs"]
mod tests;

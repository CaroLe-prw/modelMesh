use argon2::Argon2;
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng};
use std::sync::Arc;
use tokio::sync::Semaphore;
use uuid::Uuid;

use crate::{
    domain::{User, UserId},
    repository::{
        AccessTokenRepository, AuthRepository, NewUserRecord, RepositoryConflict, RepositoryError,
        UserCacheRepository,
    },
    security::hash_secret,
};

use super::auth_session_cache::AuthSessionCache;

const ACCESS_TOKEN_GENERATION_ATTEMPTS: usize = 3;
const PASSWORD_HASH_CONCURRENCY: usize = 4;

#[derive(Clone)]
pub struct AuthService {
    access_tokens: AccessTokenRepository,
    local_sessions: AuthSessionCache,
    password_hash_slots: Arc<Semaphore>,
    repository: AuthRepository,
    user_cache: UserCacheRepository,
}

pub struct AuthResult {
    pub access_token: String,
    pub user: User,
}

#[derive(Debug)]
pub enum AuthServiceError {
    InvalidEmail,
    InvalidPassword,
    EmailAlreadyExists,
    InvalidCredentials,
    Unauthenticated,
    Internal,
}

impl AuthService {
    pub fn new(
        repository: AuthRepository,
        access_tokens: AccessTokenRepository,
        user_cache: UserCacheRepository,
    ) -> Self {
        Self {
            access_tokens,
            local_sessions: AuthSessionCache::with_defaults(),
            password_hash_slots: Arc::new(Semaphore::new(PASSWORD_HASH_CONCURRENCY)),
            repository,
            user_cache,
        }
    }

    pub async fn register(
        &self,
        email: String,
        password: String,
    ) -> Result<User, AuthServiceError> {
        let email = normalize_email(&email).ok_or(AuthServiceError::InvalidEmail)?;
        validate_password(&password)?;
        let password_hash = self.hash_password(password).await?;
        let user = NewUserRecord {
            email,
            password_hash,
        };

        self.repository
            .create_user(user)
            .await
            .map_err(map_create_user_error)
    }

    pub async fn login(
        &self,
        email: String,
        password: String,
    ) -> Result<AuthResult, AuthServiceError> {
        let email = normalize_email(&email).ok_or(AuthServiceError::InvalidCredentials)?;
        validate_password(&password).map_err(|_| AuthServiceError::InvalidCredentials)?;
        let user = self
            .repository
            .find_user_by_email(&email)
            .await
            .map_err(|_| AuthServiceError::Internal)?;
        let Some(user) = user else {
            self.hash_password(password).await?;
            return Err(AuthServiceError::InvalidCredentials);
        };
        let password_matches = self.verify_password(password, user.password_hash).await?;

        if !password_matches {
            return Err(AuthServiceError::InvalidCredentials);
        }

        let access_token = self.create_access_token(user.id).await?;
        let user = User {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        if let Err(error) = self.user_cache.save(&user).await {
            tracing::warn!(user_id = user.id, %error, "current user cache write failed");
        }

        self.local_sessions
            .insert(hash_secret(&access_token), user.clone());

        Ok(AuthResult { access_token, user })
    }

    pub async fn current_user(&self, access_token: &str) -> Result<User, AuthServiceError> {
        let token_hash = hash_secret(access_token);
        if let Some(user) = self.local_sessions.get(&token_hash) {
            return Ok(user);
        }

        let (user_id, cached_user) =
            match self.user_cache.find_by_access_token_hash(&token_hash).await {
                Ok(Some(result)) => result,
                Ok(None) => return Err(AuthServiceError::Unauthenticated),
                Err(error) => {
                    tracing::warn!(%error, "authenticated user cache read failed");
                    return Err(AuthServiceError::Internal);
                }
            };
        if let Some(user) = cached_user {
            self.local_sessions.insert(token_hash, user.clone());
            return Ok(user);
        }

        let user = self
            .repository
            .find_user_by_id(user_id)
            .await
            .map_err(|_| AuthServiceError::Internal)?
            .ok_or(AuthServiceError::Unauthenticated)?;

        if let Err(error) = self.user_cache.save(&user).await {
            tracing::warn!(user_id, %error, "current user cache write failed");
        }

        self.local_sessions.insert(token_hash, user.clone());

        Ok(user)
    }

    pub async fn logout(&self, access_token: &str) -> Result<(), AuthServiceError> {
        let token_hash = hash_secret(access_token);
        self.local_sessions.revoke(token_hash.clone());
        self.access_tokens
            .delete(&token_hash)
            .await
            .map_err(|_| AuthServiceError::Internal)?;

        Ok(())
    }

    pub async fn authenticate(&self, access_token: &str) -> Result<UserId, AuthServiceError> {
        let token_hash = hash_secret(access_token);
        if let Some(user) = self.local_sessions.get(&token_hash) {
            return Ok(user.id);
        }

        self.access_tokens
            .find_user_id(&token_hash)
            .await
            .map_err(|_| AuthServiceError::Internal)?
            .ok_or(AuthServiceError::Unauthenticated)
    }

    async fn create_access_token(&self, user_id: UserId) -> Result<String, AuthServiceError> {
        for _ in 0..ACCESS_TOKEN_GENERATION_ATTEMPTS {
            let access_token = generate_access_token();
            let created = self
                .access_tokens
                .save_if_absent(&hash_secret(&access_token), user_id)
                .await
                .map_err(|_| AuthServiceError::Internal)?;

            if created {
                return Ok(access_token);
            }
        }

        Err(AuthServiceError::Internal)
    }

    async fn hash_password(&self, password: String) -> Result<String, AuthServiceError> {
        let permit = self
            .password_hash_slots
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| AuthServiceError::Internal)?;

        tokio::task::spawn_blocking(move || {
            let _permit = permit;
            let salt = SaltString::generate(&mut OsRng);
            Argon2::default()
                .hash_password(password.as_bytes(), &salt)
                .map(|hash| hash.to_string())
                .map_err(|_| AuthServiceError::Internal)
        })
        .await
        .map_err(|_| AuthServiceError::Internal)?
    }

    async fn verify_password(
        &self,
        password: String,
        password_hash: String,
    ) -> Result<bool, AuthServiceError> {
        let permit = self
            .password_hash_slots
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| AuthServiceError::Internal)?;

        tokio::task::spawn_blocking(move || {
            let _permit = permit;
            let parsed_hash =
                PasswordHash::new(&password_hash).map_err(|_| AuthServiceError::Internal)?;

            Ok(Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok())
        })
        .await
        .map_err(|_| AuthServiceError::Internal)?
    }
}

fn normalize_email(value: &str) -> Option<String> {
    let email = value.trim().to_lowercase();
    let (local, domain) = email.split_once('@')?;

    if email.len() > 254
        || local.is_empty()
        || domain.is_empty()
        || domain.starts_with('.')
        || domain.ends_with('.')
        || !domain.contains('.')
        || domain.contains('@')
        || email.chars().any(char::is_whitespace)
    {
        return None;
    }

    Some(email)
}

fn validate_password(password: &str) -> Result<(), AuthServiceError> {
    let length = password.chars().count();

    if !(8..=128).contains(&length) {
        return Err(AuthServiceError::InvalidPassword);
    }

    Ok(())
}

fn generate_access_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn map_create_user_error(error: RepositoryError) -> AuthServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::UserEmail)
    ) {
        return AuthServiceError::EmailAlreadyExists;
    }

    AuthServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_auth.rs"]
mod tests;

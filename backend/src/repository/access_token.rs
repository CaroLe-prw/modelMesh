use std::io;

use crate::{clients::RedisClient, domain::UserId};

const ACCESS_TOKEN_KEY_PREFIX: &str = "modelmesh:auth:access-token:";

#[derive(Clone)]
pub struct AccessTokenRepository {
    redis: RedisClient,
    ttl_seconds: u64,
}

impl AccessTokenRepository {
    pub fn new(redis: RedisClient, ttl_seconds: u64) -> Self {
        Self { redis, ttl_seconds }
    }

    pub async fn save_if_absent(&self, token_hash: &str, user_id: UserId) -> io::Result<bool> {
        self.redis
            .set_nx_with_ttl(
                &access_token_key(token_hash),
                &user_id.to_string(),
                self.ttl_seconds,
            )
            .await
    }

    pub async fn find_user_id(&self, token_hash: &str) -> io::Result<Option<UserId>> {
        self.redis.get(&access_token_key(token_hash)).await
    }

    pub async fn delete(&self, token_hash: &str) -> io::Result<()> {
        self.redis
            .delete(&access_token_key(token_hash))
            .await
            .map(|_| ())
    }
}

fn access_token_key(token_hash: &str) -> String {
    format!("{ACCESS_TOKEN_KEY_PREFIX}{token_hash}")
}

#[cfg(test)]
#[path = "../../tests/unit/repository_access_token.rs"]
mod tests;

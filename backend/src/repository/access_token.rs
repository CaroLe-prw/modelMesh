use std::io;

use crate::{clients::RedisClient, domain::UserId, redis_key};

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
                &redis_key::access_token(token_hash),
                &user_id.to_string(),
                self.ttl_seconds,
            )
            .await
    }

    pub async fn delete(&self, token_hash: &str) -> io::Result<()> {
        self.redis
            .delete(&redis_key::access_token(token_hash))
            .await
            .map(|_| ())
    }
}

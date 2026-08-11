use std::io;

use serde::{Deserialize, Serialize};

use crate::{
    clients::RedisClient,
    domain::{AccountRole, User, UserId},
    redis_key,
};

#[derive(Clone)]
pub struct UserCacheRepository {
    redis: RedisClient,
    ttl_seconds: u64,
}

impl UserCacheRepository {
    pub fn with_default_ttl(redis: RedisClient) -> Self {
        Self::new(redis, redis_key::ttl::CURRENT_USER_SECONDS)
    }

    pub fn new(redis: RedisClient, ttl_seconds: u64) -> Self {
        Self { redis, ttl_seconds }
    }

    pub async fn find_by_access_token_hash(
        &self,
        token_hash: &str,
    ) -> io::Result<Option<(UserId, Option<User>)>> {
        let Some((user_id, cached_user)) = self
            .redis
            .get_then_get_prefixed(
                &redis_key::access_token(token_hash),
                redis_key::current_user_prefix(),
            )
            .await?
        else {
            return Ok(None);
        };
        let user_id = user_id.parse::<UserId>().map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("access token contained an invalid user id: {error}"),
            )
        })?;
        let user = cached_user
            .as_deref()
            .and_then(|value| deserialize_user(value, user_id));
        if cached_user.is_some() && user.is_none() {
            self.redis.delete(&redis_key::current_user(user_id)).await?;
        }

        Ok(Some((user_id, user)))
    }

    pub async fn save(&self, user: &User) -> io::Result<()> {
        let value = serialize_user(user)?;
        self.redis
            .set_with_ttl(&redis_key::current_user(user.id), &value, self.ttl_seconds)
            .await
    }
}

#[derive(Deserialize, Serialize)]
struct CachedUser {
    email: String,
    id: UserId,
    role: String,
}

fn serialize_user(user: &User) -> io::Result<String> {
    serde_json::to_string(&CachedUser {
        email: user.email.clone(),
        id: user.id,
        role: user.role.as_str().to_owned(),
    })
    .map_err(io::Error::other)
}

fn deserialize_user(value: &str, expected_user_id: UserId) -> Option<User> {
    let cached = serde_json::from_str::<CachedUser>(value).ok()?;

    if cached.id != expected_user_id {
        return None;
    }

    Some(User {
        email: cached.email,
        id: cached.id,
        role: AccountRole::from_database(&cached.role)?,
    })
}

#[cfg(test)]
#[path = "../../tests/unit/repository_user_cache.rs"]
mod tests;

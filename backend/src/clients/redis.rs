use std::io;

use deadpool_redis::{
    Pool as RedisPool,
    redis::{self, FromRedisValue},
};

const GET_THEN_GET_PREFIXED_SCRIPT: &str = r#"
local linked_value = redis.call('GET', KEYS[1])
if not linked_value then
    return {}
end
local related_value = redis.call('GET', ARGV[1] .. linked_value)
return {linked_value, related_value or ''}
"#;

#[derive(Clone)]
pub struct RedisClient {
    pool: RedisPool,
}

impl RedisClient {
    pub fn new(pool: RedisPool) -> Self {
        Self { pool }
    }

    pub async fn ping(&self) -> io::Result<()> {
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;
        let response = redis::cmd("PING")
            .query_async::<String>(&mut connection)
            .await
            .map_err(io::Error::other)?;

        if response != "PONG" {
            return Err(io::Error::other("Redis returned an invalid PING response"));
        }

        Ok(())
    }

    pub async fn set_nx_with_ttl(
        &self,
        key: &str,
        value: &str,
        ttl_seconds: u64,
    ) -> io::Result<bool> {
        validate_ttl(ttl_seconds)?;

        let mut connection = self.pool.get().await.map_err(io::Error::other)?;
        let response = redis::cmd("SET")
            .arg(key)
            .arg(value)
            .arg("NX")
            .arg("EX")
            .arg(ttl_seconds)
            .query_async::<Option<String>>(&mut connection)
            .await
            .map_err(io::Error::other)?;

        Ok(response.is_some())
    }

    pub async fn set_with_ttl(&self, key: &str, value: &str, ttl_seconds: u64) -> io::Result<()> {
        validate_ttl(ttl_seconds)?;
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;

        redis::cmd("SET")
            .arg(key)
            .arg(value)
            .arg("EX")
            .arg(ttl_seconds)
            .query_async::<()>(&mut connection)
            .await
            .map_err(io::Error::other)
    }

    pub async fn get<T>(&self, key: &str) -> io::Result<Option<T>>
    where
        T: FromRedisValue,
    {
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;

        redis::cmd("GET")
            .arg(key)
            .query_async::<Option<T>>(&mut connection)
            .await
            .map_err(io::Error::other)
    }

    pub async fn get_then_get_prefixed(
        &self,
        key: &str,
        related_key_prefix: &str,
    ) -> io::Result<Option<(String, Option<String>)>> {
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;
        let values = redis::cmd("EVAL")
            .arg(GET_THEN_GET_PREFIXED_SCRIPT)
            .arg(1)
            .arg(key)
            .arg(related_key_prefix)
            .query_async::<Vec<String>>(&mut connection)
            .await
            .map_err(io::Error::other)?;

        parse_linked_values(values)
    }

    pub async fn delete(&self, key: &str) -> io::Result<bool> {
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;
        let deleted = redis::cmd("DEL")
            .arg(key)
            .query_async::<u64>(&mut connection)
            .await
            .map_err(io::Error::other)?;

        Ok(deleted > 0)
    }

    pub async fn delete_many(&self, keys: &[String]) -> io::Result<u64> {
        if keys.is_empty() {
            return Ok(0);
        }

        let mut connection = self.pool.get().await.map_err(io::Error::other)?;

        redis::cmd("DEL")
            .arg(keys)
            .query_async::<u64>(&mut connection)
            .await
            .map_err(io::Error::other)
    }
}

fn parse_linked_values(values: Vec<String>) -> io::Result<Option<(String, Option<String>)>> {
    if values.is_empty() {
        return Ok(None);
    }
    let [linked_value, related_value]: [String; 2] = values.try_into().map_err(|_| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            "Redis linked lookup returned an invalid response",
        )
    })?;
    if linked_value.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Redis linked lookup returned an empty source value",
        ));
    }

    Ok(Some((
        linked_value,
        (!related_value.is_empty()).then_some(related_value),
    )))
}

fn validate_ttl(ttl_seconds: u64) -> io::Result<()> {
    if ttl_seconds == 0 {
        Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Redis key TTL must be greater than zero",
        ))
    } else {
        Ok(())
    }
}

#[cfg(test)]
#[path = "../../tests/unit/redis_client.rs"]
mod tests;

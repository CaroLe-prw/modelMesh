use std::io;

use deadpool_redis::{
    Pool as RedisPool,
    redis::{self, FromRedisValue},
};

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
        if ttl_seconds == 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Redis key TTL must be greater than zero",
            ));
        }

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

    pub async fn delete(&self, key: &str) -> io::Result<bool> {
        let mut connection = self.pool.get().await.map_err(io::Error::other)?;
        let deleted = redis::cmd("DEL")
            .arg(key)
            .query_async::<u64>(&mut connection)
            .await
            .map_err(io::Error::other)?;

        Ok(deleted > 0)
    }
}

#[cfg(test)]
#[path = "../../tests/unit/redis_client.rs"]
mod tests;

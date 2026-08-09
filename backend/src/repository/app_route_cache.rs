use std::io;

use serde::{Deserialize, Serialize};

use crate::{
    clients::RedisClient,
    domain::{AccountRole, AppRoute, AppRouteGroup, UserId},
    redis_key,
};

#[derive(Clone)]
pub struct AppRouteCacheRepository {
    redis: RedisClient,
    ttl_seconds: u64,
}

impl AppRouteCacheRepository {
    pub fn with_default_ttl(redis: RedisClient) -> Self {
        Self::new(redis, redis_key::ttl::ACCOUNT_ROUTES_SECONDS)
    }

    pub fn new(redis: RedisClient, ttl_seconds: u64) -> Self {
        Self { redis, ttl_seconds }
    }

    pub async fn find(
        &self,
        user_id: UserId,
        expected_role: AccountRole,
    ) -> io::Result<Option<Vec<AppRoute>>> {
        let key = redis_key::account_routes(user_id);
        let Some(value) = self.redis.get::<String>(&key).await? else {
            return Ok(None);
        };
        let Some(routes) = deserialize_routes(&value, expected_role) else {
            self.redis.delete(&key).await?;
            return Ok(None);
        };

        Ok(Some(routes))
    }

    pub async fn save(
        &self,
        user_id: UserId,
        role: AccountRole,
        routes: &[AppRoute],
    ) -> io::Result<()> {
        let value = serialize_routes(role, routes)?;
        self.redis
            .set_with_ttl(
                &redis_key::account_routes(user_id),
                &value,
                self.ttl_seconds,
            )
            .await
    }

    pub async fn invalidate_users(&self, user_ids: &[UserId]) -> io::Result<u64> {
        let keys = user_ids
            .iter()
            .map(|user_id| redis_key::account_routes(*user_id))
            .collect::<Vec<_>>();

        self.redis.delete_many(&keys).await
    }
}

#[derive(Deserialize, Serialize)]
struct CachedAppRoutes {
    role: String,
    routes: Vec<CachedAppRoute>,
}

#[derive(Deserialize, Serialize)]
struct CachedAppRoute {
    route_key: String,
    path: String,
    label_key: String,
    icon_key: String,
    group: String,
    sort_order: i32,
    enabled: bool,
    roles: Vec<String>,
}

fn serialize_routes(role: AccountRole, routes: &[AppRoute]) -> io::Result<String> {
    let cached = CachedAppRoutes {
        role: role.as_str().to_owned(),
        routes: routes
            .iter()
            .map(|route| CachedAppRoute {
                route_key: route.route_key.clone(),
                path: route.path.clone(),
                label_key: route.label_key.clone(),
                icon_key: route.icon_key.clone(),
                group: route.group.as_str().to_owned(),
                sort_order: route.sort_order,
                enabled: route.enabled,
                roles: route
                    .roles
                    .iter()
                    .map(|route_role| route_role.as_str().to_owned())
                    .collect(),
            })
            .collect(),
    };

    serde_json::to_string(&cached).map_err(io::Error::other)
}

fn deserialize_routes(value: &str, expected_role: AccountRole) -> Option<Vec<AppRoute>> {
    let cached = serde_json::from_str::<CachedAppRoutes>(value).ok()?;

    if cached.role != expected_role.as_str() {
        return None;
    }

    cached
        .routes
        .into_iter()
        .map(|route| {
            Some(AppRoute {
                route_key: route.route_key,
                path: route.path,
                label_key: route.label_key,
                icon_key: route.icon_key,
                group: AppRouteGroup::from_database(&route.group)?,
                sort_order: route.sort_order,
                enabled: route.enabled,
                roles: route
                    .roles
                    .into_iter()
                    .map(|role| AccountRole::from_database(&role))
                    .collect::<Option<Vec<_>>>()?,
            })
        })
        .collect()
}

#[cfg(test)]
#[path = "../../tests/unit/repository_app_route_cache.rs"]
mod tests;

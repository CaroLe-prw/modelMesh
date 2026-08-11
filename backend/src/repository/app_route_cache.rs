use std::io;

use serde::{Deserialize, Serialize};

use crate::{
    clients::RedisClient,
    domain::{AccountRole, AppRoute, AppRouteGroup, UserId},
    redis_key,
};

const ADMIN_ROUTE_MATRIX_SCOPE: &str = "admin:matrix";

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
        self.find_routes(&key, expected_role.as_str()).await
    }

    pub async fn find_all(&self) -> io::Result<Option<Vec<AppRoute>>> {
        self.find_routes(redis_key::account_route_matrix(), ADMIN_ROUTE_MATRIX_SCOPE)
            .await
    }

    async fn find_routes(
        &self,
        key: &str,
        expected_scope: &str,
    ) -> io::Result<Option<Vec<AppRoute>>> {
        let Some(value) = self.redis.get::<String>(key).await? else {
            return Ok(None);
        };
        let Some(routes) = deserialize_routes(&value, expected_scope) else {
            self.redis.delete(key).await?;
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
        let key = redis_key::account_routes(user_id);
        self.save_routes(&key, role.as_str(), routes).await
    }

    pub async fn save_all(&self, routes: &[AppRoute]) -> io::Result<()> {
        self.save_routes(
            redis_key::account_route_matrix(),
            ADMIN_ROUTE_MATRIX_SCOPE,
            routes,
        )
        .await
    }

    async fn save_routes(&self, key: &str, scope: &str, routes: &[AppRoute]) -> io::Result<()> {
        let value = serialize_routes(scope, routes)?;
        self.redis.set_with_ttl(key, &value, self.ttl_seconds).await
    }

    pub async fn invalidate_permission_change(&self, user_ids: &[UserId]) -> io::Result<u64> {
        self.redis
            .delete_many(&permission_change_keys(user_ids))
            .await
    }
}

fn permission_change_keys(user_ids: &[UserId]) -> Vec<String> {
    let mut keys = Vec::with_capacity(user_ids.len() + 1);
    keys.push(redis_key::account_route_matrix().to_owned());
    keys.extend(
        user_ids
            .iter()
            .map(|user_id| redis_key::account_routes(*user_id)),
    );
    keys
}

#[derive(Deserialize, Serialize)]
struct CachedAppRoutes {
    scope: String,
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

fn serialize_routes(scope: &str, routes: &[AppRoute]) -> io::Result<String> {
    let cached = CachedAppRoutes {
        scope: scope.to_owned(),
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

fn deserialize_routes(value: &str, expected_scope: &str) -> Option<Vec<AppRoute>> {
    let cached = serde_json::from_str::<CachedAppRoutes>(value).ok()?;

    if cached.scope != expected_scope {
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

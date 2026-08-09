use crate::{
    domain::{AccountRole, AppRoute, UserId},
    repository::{AppRouteCacheRepository, AppRouteRepository, AppRouteRoleChange, AuthRepository},
};

const ROUTE_ACCESS_KEY: &str = "admin.route-access";

#[derive(Clone)]
pub struct AppRouteService {
    auth_repository: AuthRepository,
    cache: AppRouteCacheRepository,
    repository: AppRouteRepository,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AppRouteServiceError {
    Forbidden,
    InvalidRoles,
    NotFound,
    Internal,
}

impl AppRouteService {
    pub fn new(
        repository: AppRouteRepository,
        cache: AppRouteCacheRepository,
        auth_repository: AuthRepository,
    ) -> Self {
        Self {
            auth_repository,
            cache,
            repository,
        }
    }

    pub async fn list_visible(
        &self,
        user_id: UserId,
        role: AccountRole,
    ) -> Result<Vec<AppRoute>, AppRouteServiceError> {
        match self.cache.find(user_id, role).await {
            Ok(Some(routes)) => return Ok(routes),
            Ok(None) => {}
            Err(error) => {
                tracing::warn!(user_id, %error, "account route cache read failed");
            }
        }

        let routes = self
            .repository
            .list_visible(role)
            .await
            .map_err(|_| AppRouteServiceError::Internal)?;

        if let Err(error) = self.cache.save(user_id, role, &routes).await {
            tracing::warn!(user_id, %error, "account route cache write failed");
        }

        Ok(routes)
    }

    pub async fn list_all(
        &self,
        requester_role: AccountRole,
    ) -> Result<Vec<AppRoute>, AppRouteServiceError> {
        ensure_admin(requester_role)?;
        self.repository
            .list_all()
            .await
            .map_err(|_| AppRouteServiceError::Internal)
    }

    pub async fn update_roles(
        &self,
        requester_role: AccountRole,
        route_key: &str,
        role_values: Vec<String>,
    ) -> Result<AppRoute, AppRouteServiceError> {
        ensure_admin(requester_role)?;
        let roles = parse_roles(role_values)?;

        validate_managed_route_roles(route_key, &roles)?;

        let change = self
            .repository
            .update_roles(route_key, &roles)
            .await
            .map_err(|_| AppRouteServiceError::Internal)?
            .ok_or(AppRouteServiceError::NotFound)?;
        self.invalidate_affected_users(&change).await?;

        Ok(change.route)
    }

    async fn invalidate_affected_users(
        &self,
        change: &AppRouteRoleChange,
    ) -> Result<(), AppRouteServiceError> {
        let roles = affected_roles(change);
        let user_ids = self
            .auth_repository
            .list_user_ids_by_roles(&roles)
            .await
            .map_err(|_| AppRouteServiceError::Internal)?;
        self.cache
            .invalidate_users(&user_ids)
            .await
            .map_err(|error| {
                tracing::error!(%error, "account route cache invalidation failed");
                AppRouteServiceError::Internal
            })?;

        Ok(())
    }
}

fn affected_roles(change: &AppRouteRoleChange) -> Vec<AccountRole> {
    let mut roles = change.previous_roles.clone();

    for role in &change.route.roles {
        if !roles.contains(role) {
            roles.push(*role);
        }
    }

    roles
}

fn ensure_admin(role: AccountRole) -> Result<(), AppRouteServiceError> {
    if role == AccountRole::Admin {
        Ok(())
    } else {
        Err(AppRouteServiceError::Forbidden)
    }
}

fn parse_roles(values: Vec<String>) -> Result<Vec<AccountRole>, AppRouteServiceError> {
    let mut roles = Vec::with_capacity(values.len());

    for value in values {
        let role = AccountRole::from_database(&value).ok_or(AppRouteServiceError::InvalidRoles)?;
        if !roles.contains(&role) {
            roles.push(role);
        }
    }

    Ok(roles)
}

fn validate_managed_route_roles(
    route_key: &str,
    roles: &[AccountRole],
) -> Result<(), AppRouteServiceError> {
    if route_key == ROUTE_ACCESS_KEY && roles != [AccountRole::Admin] {
        Err(AppRouteServiceError::InvalidRoles)
    } else {
        Ok(())
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_app_route.rs"]
mod tests;

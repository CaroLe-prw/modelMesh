use std::collections::HashMap;

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

use crate::{
    domain::{AccountRole, AppRoute, AppRouteGroup},
    entity::{app_route, app_route_role},
};

use super::RepositoryError;

#[derive(Clone)]
pub struct AppRouteRepository {
    database: DatabaseConnection,
}

pub struct AppRouteRoleChange {
    pub previous_roles: Vec<AccountRole>,
    pub route: AppRoute,
}

impl AppRouteRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_visible(&self, role: AccountRole) -> Result<Vec<AppRoute>, RepositoryError> {
        let route_ids = app_route_role::Entity::find()
            .filter(app_route_role::Column::Role.eq(role.as_str()))
            .all(&self.database)
            .await?
            .into_iter()
            .map(|permission| permission.route_id)
            .collect::<Vec<_>>();

        if route_ids.is_empty() {
            return Ok(Vec::new());
        }

        let routes = app_route::Entity::find()
            .filter(app_route::Column::Id.is_in(route_ids))
            .filter(app_route::Column::Enabled.eq(true))
            .order_by_asc(app_route::Column::SortOrder)
            .order_by_asc(app_route::Column::Id)
            .all(&self.database)
            .await?;

        routes
            .into_iter()
            .map(|route| app_route_from_model(route, vec![role]))
            .collect()
    }

    pub async fn list_all(&self) -> Result<Vec<AppRoute>, RepositoryError> {
        let routes = app_route::Entity::find()
            .order_by_asc(app_route::Column::SortOrder)
            .order_by_asc(app_route::Column::Id)
            .all(&self.database)
            .await?;
        let permissions = app_route_role::Entity::find().all(&self.database).await?;
        let mut roles_by_route = HashMap::<i64, Vec<AccountRole>>::new();

        for permission in permissions {
            roles_by_route
                .entry(permission.route_id)
                .or_default()
                .push(parse_role(&permission.role)?);
        }

        routes
            .into_iter()
            .map(|route| {
                let roles = roles_by_route.remove(&route.id).unwrap_or_default();
                app_route_from_model(route, roles)
            })
            .collect()
    }

    pub async fn update_roles(
        &self,
        route_key: &str,
        roles: &[AccountRole],
    ) -> Result<Option<AppRouteRoleChange>, RepositoryError> {
        let Some(route) = app_route::Entity::find()
            .filter(app_route::Column::RouteKey.eq(route_key))
            .one(&self.database)
            .await?
        else {
            return Ok(None);
        };
        let transaction = self.database.begin().await?;
        let previous_roles = app_route_role::Entity::find()
            .filter(app_route_role::Column::RouteId.eq(route.id))
            .all(&transaction)
            .await?
            .into_iter()
            .map(|permission| parse_role(&permission.role))
            .collect::<Result<Vec<_>, _>>()?;

        app_route_role::Entity::delete_many()
            .filter(app_route_role::Column::RouteId.eq(route.id))
            .exec(&transaction)
            .await?;

        for role in roles {
            app_route_role::ActiveModel {
                route_id: Set(route.id),
                role: Set(role.as_str().to_owned()),
                ..Default::default()
            }
            .insert(&transaction)
            .await?;
        }

        transaction.commit().await?;
        let route = app_route_from_model(route, roles.to_vec())?;

        Ok(Some(AppRouteRoleChange {
            previous_roles,
            route,
        }))
    }
}

fn app_route_from_model(
    model: app_route::Model,
    mut roles: Vec<AccountRole>,
) -> Result<AppRoute, RepositoryError> {
    roles.sort_by_key(|role| role_rank(*role));

    Ok(AppRoute {
        route_key: model.route_key,
        path: model.path,
        label_key: model.label_key,
        icon_key: model.icon_key,
        group: AppRouteGroup::from_database(&model.group_key).ok_or_else(|| {
            RepositoryError::InvalidData(format!("unknown app route group `{}`", model.group_key))
        })?,
        sort_order: model.sort_order,
        enabled: model.enabled,
        roles,
    })
}

fn parse_role(value: &str) -> Result<AccountRole, RepositoryError> {
    AccountRole::from_database(value)
        .ok_or_else(|| RepositoryError::InvalidData(format!("unknown app route role `{value}`")))
}

const fn role_rank(role: AccountRole) -> u8 {
    match role {
        AccountRole::Personal => 0,
        AccountRole::Merchant => 1,
        AccountRole::Admin => 2,
    }
}

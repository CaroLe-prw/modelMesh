use std::net::IpAddr;

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    QuerySelect, Set, entity::prelude::IpNetwork, sea_query::Expr,
};

use crate::{
    domain::{AccountRole, AccountStatus, User, UserId},
    entity::user,
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct AuthRepository {
    database: DatabaseConnection,
}

pub struct NewUserRecord {
    pub email: String,
    pub password_hash: String,
    pub username: String,
}

pub struct AuthUserRecord {
    pub id: UserId,
    pub email: String,
    pub password_hash: String,
    pub role: AccountRole,
    pub status: AccountStatus,
}

impl AuthRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn create_user(&self, new_user: NewUserRecord) -> Result<User, RepositoryError> {
        let created_user = user::ActiveModel {
            email: Set(new_user.email),
            password_hash: Set(new_user.password_hash),
            username: Set(new_user.username),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_create_user_error)?;

        user_from_model(created_user)
    }

    pub async fn find_user_by_email(
        &self,
        email: &str,
    ) -> Result<Option<AuthUserRecord>, RepositoryError> {
        let user = user::Entity::find()
            .filter(user::Column::Email.eq(email))
            .one(&self.database)
            .await?;

        user.map(|user| {
            Ok(AuthUserRecord {
                id: user.id,
                email: user.email,
                password_hash: user.password_hash,
                role: parse_role(&user.role)?,
                status: parse_status(&user.status)?,
            })
        })
        .transpose()
    }

    pub async fn find_user_by_id(&self, user_id: UserId) -> Result<Option<User>, RepositoryError> {
        let user = user::Entity::find_by_id(user_id)
            .one(&self.database)
            .await?;

        user.map(user_from_model).transpose()
    }

    pub async fn list_user_ids_by_roles(
        &self,
        roles: &[AccountRole],
    ) -> Result<Vec<UserId>, RepositoryError> {
        if roles.is_empty() {
            return Ok(Vec::new());
        }

        user::Entity::find()
            .select_only()
            .column(user::Column::Id)
            .filter(user::Column::Role.is_in(roles.iter().map(|role| role.as_str())))
            .into_tuple::<UserId>()
            .all(&self.database)
            .await
            .map_err(RepositoryError::from)
    }

    pub async fn record_login(
        &self,
        user_id: UserId,
        ip_address: Option<IpAddr>,
    ) -> Result<(), RepositoryError> {
        let result = user::Entity::update_many()
            .set(user::ActiveModel {
                last_login_ip: Set(ip_address.map(IpNetwork::from)),
                ..Default::default()
            })
            .col_expr(user::Column::LastLoginAt, Expr::current_timestamp())
            .col_expr(user::Column::LastActiveAt, Expr::current_timestamp())
            .filter(user::Column::Id.eq(user_id))
            .exec(&self.database)
            .await?;

        if result.rows_affected == 1 {
            Ok(())
        } else {
            Err(RepositoryError::InvalidData(
                "authenticated user disappeared before login was recorded".to_owned(),
            ))
        }
    }

    pub async fn record_activity(&self, user_id: UserId) -> Result<(), RepositoryError> {
        let result = user::Entity::update_many()
            .col_expr(user::Column::LastActiveAt, Expr::current_timestamp())
            .filter(user::Column::Id.eq(user_id))
            .exec(&self.database)
            .await?;

        if result.rows_affected == 1 {
            Ok(())
        } else {
            Err(RepositoryError::InvalidData(
                "authenticated user disappeared before activity was recorded".to_owned(),
            ))
        }
    }
}

fn user_from_model(user: user::Model) -> Result<User, RepositoryError> {
    Ok(User {
        id: user.id,
        email: user.email,
        role: parse_role(&user.role)?,
        status: parse_status(&user.status)?,
    })
}

fn parse_status(value: &str) -> Result<AccountStatus, RepositoryError> {
    AccountStatus::from_database(value)
        .ok_or_else(|| RepositoryError::InvalidData(format!("unknown user status `{value}`")))
}

fn parse_role(value: &str) -> Result<AccountRole, RepositoryError> {
    AccountRole::from_database(value)
        .ok_or_else(|| RepositoryError::InvalidData(format!("unknown user role `{value}`")))
}

fn map_create_user_error(error: DbErr) -> RepositoryError {
    if database_constraint(&error) == Some("users_email_key") {
        return RepositoryError::Conflict(RepositoryConflict::UserEmail);
    }

    RepositoryError::Database(error)
}

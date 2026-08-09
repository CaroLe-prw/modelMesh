use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    QuerySelect, Set,
};

use crate::{
    domain::{AccountRole, User, UserId},
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
}

pub struct AuthUserRecord {
    pub id: UserId,
    pub email: String,
    pub password_hash: String,
    pub role: AccountRole,
}

impl AuthRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn create_user(&self, new_user: NewUserRecord) -> Result<User, RepositoryError> {
        let created_user = user::ActiveModel {
            email: Set(new_user.email),
            password_hash: Set(new_user.password_hash),
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
}

fn user_from_model(user: user::Model) -> Result<User, RepositoryError> {
    Ok(User {
        id: user.id,
        email: user.email,
        role: parse_role(&user.role)?,
    })
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

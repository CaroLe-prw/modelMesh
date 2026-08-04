use sqlx::PgPool;

use crate::domain::{User, UserId};

#[derive(Clone)]
pub struct AuthRepository {
    pool: PgPool,
}

pub struct NewUserRecord {
    pub email: String,
    pub password_hash: String,
}

pub struct AuthUserRecord {
    pub id: UserId,
    pub email: String,
    pub password_hash: String,
}

impl AuthRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_user(&self, user: NewUserRecord) -> Result<User, sqlx::Error> {
        let created_user = sqlx::query_as::<_, (UserId, String)>(
            r#"
            INSERT INTO users (email, password_hash)
            VALUES ($1, $2)
            RETURNING id, email
            "#,
        )
        .bind(user.email)
        .bind(user.password_hash)
        .fetch_one(&self.pool)
        .await?;

        Ok(User {
            id: created_user.0,
            email: created_user.1,
        })
    }

    pub async fn find_user_by_email(
        &self,
        email: &str,
    ) -> Result<Option<AuthUserRecord>, sqlx::Error> {
        let user = sqlx::query_as::<_, (UserId, String, String)>(
            r#"
            SELECT id, email, password_hash
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user.map(|(id, email, password_hash)| AuthUserRecord {
            id,
            email,
            password_hash,
        }))
    }

    pub async fn find_user_by_id(&self, user_id: UserId) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, (UserId, String)>(
            r#"
            SELECT id, email
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user.map(|(id, email)| User { id, email }))
    }
}

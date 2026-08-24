use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, Set,
    sea_query::Expr,
};
use time::OffsetDateTime;

use crate::{
    domain::{MerchantApplication, MerchantApplicationStatus, UserId},
    entity::merchant_application,
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct MerchantApplicationRepository {
    database: DatabaseConnection,
}

pub struct NewMerchantApplicationRecord {
    pub business_name: String,
    pub avatar_url: Option<String>,
    pub website: Option<String>,
    pub description: String,
}

impl MerchantApplicationRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_user(
        &self,
        user_id: UserId,
    ) -> Result<Option<MerchantApplication>, RepositoryError> {
        merchant_application::Entity::find()
            .filter(merchant_application::Column::UserId.eq(user_id))
            .one(&self.database)
            .await?
            .map(merchant_application_from_model)
            .transpose()
    }

    pub async fn submit(
        &self,
        user_id: UserId,
        application: NewMerchantApplicationRecord,
    ) -> Result<MerchantApplication, RepositoryError> {
        if let Some(existing) = self.find_by_user(user_id).await? {
            if existing.status != MerchantApplicationStatus::Rejected {
                return Err(RepositoryError::Conflict(
                    RepositoryConflict::MerchantApplication,
                ));
            }

            let updated = merchant_application::Entity::update_many()
                .set(merchant_application::ActiveModel {
                    business_name: Set(application.business_name),
                    avatar_url: Set(application.avatar_url),
                    website: Set(application.website),
                    description: Set(application.description),
                    status: Set(MerchantApplicationStatus::Pending.as_str().to_owned()),
                    review_note: Set(String::new()),
                    reviewed_by: Set(None),
                    reviewed_at: Set(None),
                    ..Default::default()
                })
                .col_expr(
                    merchant_application::Column::UpdatedAt,
                    Expr::current_timestamp(),
                )
                .filter(merchant_application::Column::UserId.eq(user_id))
                .filter(
                    merchant_application::Column::Status
                        .eq(MerchantApplicationStatus::Rejected.as_str()),
                )
                .exec_with_returning(&self.database)
                .await?
                .into_iter()
                .next();

            return updated
                .map(merchant_application_from_model)
                .transpose()?
                .ok_or(RepositoryError::Conflict(
                    RepositoryConflict::MerchantApplication,
                ));
        }

        let created = merchant_application::ActiveModel {
            user_id: Set(user_id),
            business_name: Set(application.business_name),
            avatar_url: Set(application.avatar_url),
            website: Set(application.website),
            description: Set(application.description),
            status: Set(MerchantApplicationStatus::Pending.as_str().to_owned()),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_write_error)?;

        merchant_application_from_model(created)
    }
}

fn merchant_application_from_model(
    model: merchant_application::Model,
) -> Result<MerchantApplication, RepositoryError> {
    Ok(MerchantApplication {
        id: model.id,
        application_code: model.application_code,
        business_name: model.business_name,
        avatar_url: model.avatar_url,
        website: model.website,
        description: model.description,
        status: MerchantApplicationStatus::from_database(&model.status).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "unknown merchant application status `{}`",
                model.status
            ))
        })?,
        review_note: model.review_note,
        reviewed_at: model.reviewed_at.map(domain_timestamp).transpose()?,
        created_at: domain_timestamp(model.created_at)?,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn map_write_error(error: DbErr) -> RepositoryError {
    if database_constraint(&error) == Some("merchant_applications_user_unique") {
        return RepositoryError::Conflict(RepositoryConflict::MerchantApplication);
    }

    RepositoryError::Database(error)
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

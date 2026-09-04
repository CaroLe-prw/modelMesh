use std::collections::HashMap;

use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set,
    sea_query::{Expr, LikeExpr, extension::postgres::PgExpr},
};
use time::OffsetDateTime;

use crate::{
    domain::{Brand, BrandStatus, Page, Pagination},
    entity::{brand, brand_preset, model},
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct BrandRepository {
    database: DatabaseConnection,
}

pub struct BrandSearch {
    pub pattern: Option<String>,
    pub status: Option<BrandStatus>,
}

pub struct NewBrandRecord {
    pub identifier: String,
    pub name: String,
    pub preset_id: Option<i64>,
    pub avatar_data_url: Option<String>,
    pub sort_order: i32,
    pub status: BrandStatus,
}

pub struct UpdateBrandRecord {
    pub name: String,
    pub sort_order: i32,
}

impl BrandRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(&self, search: &BrandSearch) -> Result<Vec<Brand>, RepositoryError> {
        let model_counts_query = model::Entity::find()
            .select_only()
            .column(model::Column::BrandId)
            .column_as(model::Column::Id.count(), "model_count")
            .group_by(model::Column::BrandId)
            .into_tuple::<(i64, i64)>()
            .all(&self.database);
        let brands_query = brand_list_query(search)
            .find_also_related(brand_preset::Entity)
            .all(&self.database);
        let (model_counts, brands) = tokio::try_join!(model_counts_query, brands_query)?;
        let model_counts = model_counts.into_iter().collect::<HashMap<_, _>>();

        brands
            .into_iter()
            .map(|(brand, preset)| {
                let model_count = model_counts.get(&brand.id).copied().unwrap_or(0);
                let model_count = u64::try_from(model_count)
                    .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
                brand_from_models(brand, preset, model_count)
            })
            .collect()
    }

    pub async fn list_page(
        &self,
        search: &BrandSearch,
        pagination: Pagination,
    ) -> Result<Page<Brand>, RepositoryError> {
        let model_counts_query = model::Entity::find()
            .select_only()
            .column(model::Column::BrandId)
            .column_as(model::Column::Id.count(), "model_count")
            .group_by(model::Column::BrandId)
            .into_tuple::<(i64, i64)>()
            .all(&self.database);
        let total_query = brand_list_query(search).count(&self.database);
        let brands_query = brand_page_query(search, pagination)
            .find_also_related(brand_preset::Entity)
            .all(&self.database);
        let (model_counts, total, brands) =
            tokio::try_join!(model_counts_query, total_query, brands_query)?;
        let model_counts = model_counts.into_iter().collect::<HashMap<_, _>>();
        let items = brands
            .into_iter()
            .map(|(brand, preset)| {
                let model_count = model_counts.get(&brand.id).copied().unwrap_or(0);
                let model_count = u64::try_from(model_count)
                    .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
                brand_from_models(brand, preset, model_count)
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    pub async fn is_active_identifier(&self, identifier: &str) -> Result<bool, RepositoryError> {
        Ok(brand::Entity::find()
            .filter(brand::Column::Identifier.eq(identifier))
            .filter(brand::Column::Status.eq(BrandStatus::Active.as_str()))
            .one(&self.database)
            .await?
            .is_some())
    }

    pub async fn create(&self, record: NewBrandRecord) -> Result<Brand, RepositoryError> {
        let identifier = record.identifier.clone();
        brand::ActiveModel {
            identifier: Set(record.identifier),
            name: Set(record.name),
            preset_id: Set(record.preset_id),
            avatar_data_url: Set(record.avatar_data_url),
            sort_order: Set(record.sort_order),
            status: Set(record.status.as_str().to_owned()),
            ..Default::default()
        }
        .insert(&self.database)
        .await
        .map_err(map_brand_write_error)?;

        self.find_by_identifier(&identifier)
            .await?
            .ok_or_else(|| RepositoryError::InvalidData("created brand was not found".to_owned()))
    }

    pub async fn update_status(
        &self,
        identifier: &str,
        status: BrandStatus,
    ) -> Result<Option<Brand>, RepositoryError> {
        let updated = brand::Entity::update_many()
            .set(brand::ActiveModel {
                status: Set(status.as_str().to_owned()),
                ..Default::default()
            })
            .col_expr(brand::Column::UpdatedAt, Expr::current_timestamp())
            .filter(brand::Column::Identifier.eq(identifier))
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next();

        if updated.is_none() {
            return Ok(None);
        }

        self.find_by_identifier(identifier).await
    }

    pub async fn update(
        &self,
        identifier: &str,
        record: UpdateBrandRecord,
    ) -> Result<Option<Brand>, RepositoryError> {
        let updated = brand::Entity::update_many()
            .set(brand::ActiveModel {
                name: Set(record.name),
                sort_order: Set(record.sort_order),
                ..Default::default()
            })
            .col_expr(brand::Column::UpdatedAt, Expr::current_timestamp())
            .filter(brand::Column::Identifier.eq(identifier))
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next();

        if updated.is_none() {
            return Ok(None);
        }

        self.find_by_identifier(identifier).await
    }

    pub async fn delete(&self, identifier: &str) -> Result<bool, RepositoryError> {
        let result = brand::Entity::delete_many()
            .filter(brand::Column::Identifier.eq(identifier))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected > 0)
    }

    async fn find_by_identifier(&self, identifier: &str) -> Result<Option<Brand>, RepositoryError> {
        let Some((brand, preset)) = brand::Entity::find()
            .filter(brand::Column::Identifier.eq(identifier))
            .find_also_related(brand_preset::Entity)
            .one(&self.database)
            .await?
        else {
            return Ok(None);
        };
        let model_count = model::Entity::find()
            .filter(model::Column::BrandId.eq(brand.id))
            .count(&self.database)
            .await?;

        brand_from_models(brand, preset, model_count).map(Some)
    }
}

fn brand_list_query(search: &BrandSearch) -> sea_orm::Select<brand::Entity> {
    let mut query = brand::Entity::find();

    if let Some(pattern) = search.pattern.as_deref() {
        let like = LikeExpr::new(pattern).escape('\\');
        query = query.filter(
            Condition::any()
                .add(Expr::col(brand::Column::Name).ilike(like.clone()))
                .add(Expr::col(brand::Column::Identifier).ilike(like)),
        );
    }

    if let Some(status) = search.status {
        query = query.filter(brand::Column::Status.eq(status.as_str()));
    }

    query
        .order_by_asc(brand::Column::SortOrder)
        .order_by_asc(brand::Column::Id)
}

fn brand_page_query(
    search: &BrandSearch,
    pagination: Pagination,
) -> sea_orm::Select<brand::Entity> {
    brand_list_query(search)
        .limit(u64::from(pagination.page_size()))
        .offset(u64::from(pagination.page_index()) * u64::from(pagination.page_size()))
}

fn brand_from_models(
    model: brand::Model,
    preset: Option<brand_preset::Model>,
    model_count: u64,
) -> Result<Brand, RepositoryError> {
    let status = match model.status.as_str() {
        "active" => BrandStatus::Active,
        "hidden" => BrandStatus::Hidden,
        value => {
            return Err(RepositoryError::InvalidData(format!(
                "invalid brand status: {value}"
            )));
        }
    };

    Ok(Brand {
        identifier: model.identifier,
        name: model.name,
        avatar_svg: preset.map(|preset| preset.avatar_svg),
        avatar_url: model.avatar_data_url,
        model_count,
        merchant_count: 0,
        sort_order: model.sort_order,
        status,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn map_brand_write_error(error: DbErr) -> RepositoryError {
    match database_constraint(&error) {
        Some("brands_identifier_unique") => {
            RepositoryError::Conflict(RepositoryConflict::BrandIdentifier)
        }
        Some("brands_preset_unique") => RepositoryError::Conflict(RepositoryConflict::BrandPreset),
        _ => RepositoryError::Database(error),
    }
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_brand.rs"]
mod tests;

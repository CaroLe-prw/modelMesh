use std::collections::HashMap;

use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Set, TransactionTrait,
    sea_query::{Expr, LikeExpr, extension::postgres::PgExpr},
};
use time::OffsetDateTime;

use crate::{
    domain::{ManagedModel, ModelPricing, ModelStatus, Page, Pagination},
    entity::{brand, model},
};

use super::{RepositoryConflict, RepositoryError, database_constraint};

#[derive(Clone)]
pub struct ModelRepository {
    database: DatabaseConnection,
}

pub struct NewModelRecord {
    pub brand_identifier: String,
    pub identifier: String,
    pub name: String,
    pub catalog_source: Option<String>,
    pub catalog_provider_id: Option<String>,
    pub catalog_model_id: Option<String>,
    pub context_window: i64,
    pub input_price_nano_usd_per_million: i64,
    pub input_price_overridden: bool,
    pub cache_read_price_nano_usd_per_million: i64,
    pub cache_read_price_overridden: bool,
    pub cache_write_price_nano_usd_per_million: i64,
    pub cache_write_price_overridden: bool,
    pub output_price_nano_usd_per_million: i64,
    pub output_price_overridden: bool,
    pub default_pricing_nano_usd: ModelPricing,
    pub pricing_overrides_nano_usd: ModelPricing,
    pub status: ModelStatus,
}

pub struct ModelSearch {
    pub pattern: Option<String>,
    pub brand_identifier: Option<String>,
    pub status: Option<ModelStatus>,
}

pub struct UpdateModelPricingRecord {
    pub pricing_overrides_nano_usd: ModelPricing,
}

impl ModelRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(
        &self,
        search: &ModelSearch,
        pagination: Pagination,
    ) -> Result<Page<ManagedModel>, RepositoryError> {
        let paginator =
            model_list_query(search).paginate(&self.database, u64::from(pagination.page_size()));
        let (total, models) = tokio::try_join!(
            paginator.num_items(),
            paginator.fetch_page(u64::from(pagination.page_index()))
        )?;
        let items = models
            .into_iter()
            .map(|(model, brand)| {
                let brand = brand.ok_or_else(|| {
                    RepositoryError::InvalidData("model brand was not found".to_owned())
                })?;
                managed_model_from_models(model, brand)
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Page::new(items, pagination, total))
    }

    pub async fn create(
        &self,
        record: NewModelRecord,
    ) -> Result<Option<ManagedModel>, RepositoryError> {
        Ok(self
            .create_many(vec![record])
            .await?
            .and_then(|mut models| models.pop()))
    }

    pub async fn create_many(
        &self,
        records: Vec<NewModelRecord>,
    ) -> Result<Option<Vec<ManagedModel>>, RepositoryError> {
        let transaction = self.database.begin().await?;
        let mut brands = HashMap::<String, brand::Model>::new();
        let mut models = Vec::with_capacity(records.len());

        for record in records {
            let brand_identifier = record.brand_identifier.clone();
            if !brands.contains_key(&brand_identifier) {
                let Some(brand) = brand::Entity::find()
                    .filter(brand::Column::Identifier.eq(&brand_identifier))
                    .one(&transaction)
                    .await?
                else {
                    transaction.rollback().await?;
                    return Ok(None);
                };
                brands.insert(brand_identifier.clone(), brand);
            }
            let brand = brands.get(&brand_identifier).cloned().ok_or_else(|| {
                RepositoryError::InvalidData("model brand cache was not populated".to_owned())
            })?;
            let active = new_model_active(record, brand.id)?;
            let inserted = match active.insert(&transaction).await {
                Ok(inserted) => inserted,
                Err(error) => {
                    let error = map_model_write_error(error);
                    transaction.rollback().await?;
                    return Err(error);
                }
            };
            let model = match managed_model_from_models(inserted, brand) {
                Ok(model) => model,
                Err(error) => {
                    transaction.rollback().await?;
                    return Err(error);
                }
            };
            models.push(model);
        }
        transaction.commit().await?;

        Ok(Some(models))
    }

    pub async fn update_status(
        &self,
        id: i64,
        status: ModelStatus,
    ) -> Result<Option<ManagedModel>, RepositoryError> {
        let updated = model::Entity::update_many()
            .set(model::ActiveModel {
                status: Set(status.as_str().to_owned()),
                ..Default::default()
            })
            .col_expr(model::Column::UpdatedAt, Expr::current_timestamp())
            .filter(model::Column::Id.eq(id))
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next();

        if updated.is_none() {
            return Ok(None);
        }

        self.find_by_id(id).await
    }

    pub async fn delete(&self, id: i64) -> Result<bool, RepositoryError> {
        let result = model::Entity::delete_many()
            .filter(model::Column::Id.eq(id))
            .exec(&self.database)
            .await?;

        Ok(result.rows_affected > 0)
    }

    pub async fn update_pricing(
        &self,
        id: i64,
        record: UpdateModelPricingRecord,
    ) -> Result<Option<ManagedModel>, RepositoryError> {
        let Some((existing, brand)) = model::Entity::find()
            .find_also_related(brand::Entity)
            .filter(model::Column::Id.eq(id))
            .one(&self.database)
            .await?
        else {
            return Ok(None);
        };
        let brand = brand
            .ok_or_else(|| RepositoryError::InvalidData("model brand was not found".to_owned()))?;
        let uses_catalog_pricing = existing.catalog_source.is_some();
        let current_default_pricing = pricing_from_json(existing.default_pricing_nano_usd.clone())?;
        let (default_pricing, pricing_overrides) = if uses_catalog_pricing {
            (current_default_pricing, record.pricing_overrides_nano_usd)
        } else {
            (record.pricing_overrides_nano_usd, ModelPricing::default())
        };
        let input_price = resolved_base_price(&default_pricing, &pricing_overrides, "input");
        let cache_read_price =
            resolved_base_price(&default_pricing, &pricing_overrides, "cache_read");
        let cache_write_price =
            resolved_base_price(&default_pricing, &pricing_overrides, "cache_write");
        let output_price = resolved_base_price(&default_pricing, &pricing_overrides, "output");
        let default_pricing_nano_usd = serde_json::to_value(default_pricing)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
        let pricing_overrides_nano_usd = serde_json::to_value(pricing_overrides)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
        let mut active: model::ActiveModel = existing.into();
        active.input_price_nano_usd_per_million = Set(input_price.0);
        active.input_price_overridden = Set(input_price.1);
        active.cache_read_price_nano_usd_per_million = Set(cache_read_price.0);
        active.cache_read_price_overridden = Set(cache_read_price.1);
        active.cache_write_price_nano_usd_per_million = Set(cache_write_price.0);
        active.cache_write_price_overridden = Set(cache_write_price.1);
        active.output_price_nano_usd_per_million = Set(output_price.0);
        active.output_price_overridden = Set(output_price.1);
        active.default_pricing_nano_usd = Set(default_pricing_nano_usd);
        active.pricing_overrides_nano_usd = Set(pricing_overrides_nano_usd);
        active.updated_at = Set(OffsetDateTime::now_utc());
        let updated = active.update(&self.database).await?;

        managed_model_from_models(updated, brand).map(Some)
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<ManagedModel>, RepositoryError> {
        model::Entity::find_by_id(id)
            .find_also_related(brand::Entity)
            .one(&self.database)
            .await?
            .map(|(model, brand)| {
                let brand = brand.ok_or_else(|| {
                    RepositoryError::InvalidData("model brand was not found".to_owned())
                })?;
                managed_model_from_models(model, brand)
            })
            .transpose()
    }
}

fn new_model_active(
    record: NewModelRecord,
    brand_id: i64,
) -> Result<model::ActiveModel, RepositoryError> {
    let default_pricing_nano_usd = serde_json::to_value(record.default_pricing_nano_usd)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
    let pricing_overrides_nano_usd = serde_json::to_value(record.pricing_overrides_nano_usd)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;

    Ok(model::ActiveModel {
        brand_id: Set(brand_id),
        identifier: Set(record.identifier),
        name: Set(record.name),
        catalog_source: Set(record.catalog_source),
        catalog_provider_id: Set(record.catalog_provider_id),
        catalog_model_id: Set(record.catalog_model_id),
        context_window: Set(record.context_window),
        input_price_nano_usd_per_million: Set(record.input_price_nano_usd_per_million),
        input_price_overridden: Set(record.input_price_overridden),
        cache_read_price_nano_usd_per_million: Set(record.cache_read_price_nano_usd_per_million),
        cache_read_price_overridden: Set(record.cache_read_price_overridden),
        cache_write_price_nano_usd_per_million: Set(record.cache_write_price_nano_usd_per_million),
        cache_write_price_overridden: Set(record.cache_write_price_overridden),
        output_price_nano_usd_per_million: Set(record.output_price_nano_usd_per_million),
        output_price_overridden: Set(record.output_price_overridden),
        default_pricing_nano_usd: Set(default_pricing_nano_usd),
        pricing_overrides_nano_usd: Set(pricing_overrides_nano_usd),
        status: Set(record.status.as_str().to_owned()),
        ..Default::default()
    })
}

fn model_list_query(search: &ModelSearch) -> sea_orm::SelectTwo<model::Entity, brand::Entity> {
    let mut query = model::Entity::find().find_also_related(brand::Entity);

    if let Some(pattern) = search.pattern.as_deref() {
        let like = LikeExpr::new(pattern).escape('\\');
        query = query.filter(
            Condition::any()
                .add(Expr::col((model::Entity, model::Column::Name)).ilike(like.clone()))
                .add(Expr::col((model::Entity, model::Column::Identifier)).ilike(like.clone()))
                .add(Expr::col((brand::Entity, brand::Column::Name)).ilike(like.clone()))
                .add(Expr::col((brand::Entity, brand::Column::Identifier)).ilike(like)),
        );
    }

    if let Some(brand_identifier) = search.brand_identifier.as_deref() {
        query = query.filter(brand::Column::Identifier.eq(brand_identifier));
    }

    if let Some(status) = search.status {
        query = query.filter(model::Column::Status.eq(status.as_str()));
    }

    query
        .order_by_asc(brand::Column::SortOrder)
        .order_by_asc(model::Column::Name)
        .order_by_asc(model::Column::Id)
}

fn managed_model_from_models(
    model: model::Model,
    brand: brand::Model,
) -> Result<ManagedModel, RepositoryError> {
    let status = match model.status.as_str() {
        "published" => ModelStatus::Published,
        "disabled" => ModelStatus::Disabled,
        value => {
            return Err(RepositoryError::InvalidData(format!(
                "invalid model status: {value}"
            )));
        }
    };

    Ok(ManagedModel {
        id: model.id,
        brand_identifier: brand.identifier,
        identifier: model.identifier,
        name: model.name,
        catalog_source: model.catalog_source,
        context_window: model.context_window,
        input_price_nano_usd_per_million: model.input_price_nano_usd_per_million,
        input_price_overridden: model.input_price_overridden,
        cache_read_price_nano_usd_per_million: model.cache_read_price_nano_usd_per_million,
        cache_read_price_overridden: model.cache_read_price_overridden,
        cache_write_price_nano_usd_per_million: model.cache_write_price_nano_usd_per_million,
        cache_write_price_overridden: model.cache_write_price_overridden,
        output_price_nano_usd_per_million: model.output_price_nano_usd_per_million,
        output_price_overridden: model.output_price_overridden,
        default_pricing: pricing_from_json(model.default_pricing_nano_usd)?,
        pricing_overrides: pricing_from_json(model.pricing_overrides_nano_usd)?,
        merchant_count: 0,
        status,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn pricing_from_json(value: serde_json::Value) -> Result<ModelPricing, RepositoryError> {
    serde_json::from_value(value).map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

fn resolved_base_price(
    defaults: &ModelPricing,
    overrides: &ModelPricing,
    rate: &str,
) -> (i64, bool) {
    overrides
        .base
        .get(rate)
        .copied()
        .map(|value| (value, true))
        .unwrap_or_else(|| (defaults.base.get(rate).copied().unwrap_or(0), false))
}

fn map_model_write_error(error: DbErr) -> RepositoryError {
    match database_constraint(&error) {
        Some("models_brand_identifier_unique") => {
            RepositoryError::Conflict(RepositoryConflict::ModelIdentifier)
        }
        _ => RepositoryError::Database(error),
    }
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_model.rs"]
mod tests;

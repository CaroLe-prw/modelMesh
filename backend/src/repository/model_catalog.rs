use jiff::Timestamp;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseBackend, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, Select, Statement, TransactionTrait,
    sea_query::{Expr, ExprTrait, Func},
};
use serde::Serialize;
use time::OffsetDateTime;

use crate::{
    domain::{ModelCatalogEntry, ModelPricing},
    entity::{brand, brand_preset, model_catalog_entry, model_catalog_sync_state},
};

use super::RepositoryError;

pub const MODELS_DEV_SOURCE: &str = "models.dev";

const UPSERT_CATALOG_SQL: &str = r#"
INSERT INTO model_catalog_entries (
    source,
    provider_id,
    model_id,
    model_name,
    context_window,
    cache_read_price_nano_usd_per_million,
    cache_write_price_nano_usd_per_million,
    input_price_nano_usd_per_million,
    output_price_nano_usd_per_million,
    pricing_nano_usd,
    source_data,
    source_synced_at
)
SELECT
    'models.dev',
    payload.provider_id,
    payload.model_id,
    payload.model_name,
    payload.context_window,
    payload.cache_read_price_nano_usd_per_million,
    payload.cache_write_price_nano_usd_per_million,
    payload.input_price_nano_usd_per_million,
    payload.output_price_nano_usd_per_million,
    payload.pricing_nano_usd,
    payload.source_data,
    NOW()
FROM jsonb_to_recordset($1::jsonb) AS payload(
    provider_id TEXT,
    model_id TEXT,
    model_name TEXT,
    context_window BIGINT,
    cache_read_price_nano_usd_per_million BIGINT,
    cache_write_price_nano_usd_per_million BIGINT,
    input_price_nano_usd_per_million BIGINT,
    output_price_nano_usd_per_million BIGINT,
    pricing_nano_usd JSONB,
    source_data JSONB
)
ON CONFLICT (source, provider_id, model_id) DO UPDATE
SET model_name = EXCLUDED.model_name,
    context_window = EXCLUDED.context_window,
    cache_read_price_nano_usd_per_million = EXCLUDED.cache_read_price_nano_usd_per_million,
    cache_write_price_nano_usd_per_million = EXCLUDED.cache_write_price_nano_usd_per_million,
    input_price_nano_usd_per_million = EXCLUDED.input_price_nano_usd_per_million,
    output_price_nano_usd_per_million = EXCLUDED.output_price_nano_usd_per_million,
    pricing_nano_usd = EXCLUDED.pricing_nano_usd,
    source_data = EXCLUDED.source_data,
    source_synced_at = NOW();
"#;

const DELETE_STALE_CATALOG_SQL: &str = r#"
DELETE FROM model_catalog_entries AS existing
WHERE existing.source = 'models.dev'
  AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset($1::jsonb) AS payload(provider_id TEXT, model_id TEXT)
      WHERE payload.provider_id = existing.provider_id
        AND payload.model_id = existing.model_id
  );
"#;

const UPDATE_DEFAULT_MODEL_PRICES_SQL: &str = r#"
WITH payload AS (
    SELECT *
    FROM jsonb_to_recordset($1::jsonb) AS entry(
        provider_id TEXT,
        model_id TEXT,
        model_name TEXT,
        context_window BIGINT,
        cache_read_price_nano_usd_per_million BIGINT,
        cache_write_price_nano_usd_per_million BIGINT,
        input_price_nano_usd_per_million BIGINT,
        output_price_nano_usd_per_million BIGINT,
        pricing_nano_usd JSONB,
        source_data JSONB
    )
)
UPDATE models AS managed
SET name = payload.model_name,
    context_window = COALESCE(payload.context_window, managed.context_window),
    input_price_nano_usd_per_million = CASE
        WHEN managed.input_price_overridden THEN managed.input_price_nano_usd_per_million
        ELSE COALESCE(payload.input_price_nano_usd_per_million, 0)
    END,
    cache_read_price_nano_usd_per_million = CASE
        WHEN managed.cache_read_price_overridden THEN managed.cache_read_price_nano_usd_per_million
        ELSE COALESCE(payload.cache_read_price_nano_usd_per_million, 0)
    END,
    cache_write_price_nano_usd_per_million = CASE
        WHEN managed.cache_write_price_overridden THEN managed.cache_write_price_nano_usd_per_million
        ELSE COALESCE(payload.cache_write_price_nano_usd_per_million, 0)
    END,
    output_price_nano_usd_per_million = CASE
        WHEN managed.output_price_overridden THEN managed.output_price_nano_usd_per_million
        ELSE COALESCE(payload.output_price_nano_usd_per_million, 0)
    END,
    default_pricing_nano_usd = payload.pricing_nano_usd,
    updated_at = NOW()
FROM payload
WHERE managed.catalog_source = 'models.dev'
  AND managed.catalog_provider_id = payload.provider_id
  AND managed.catalog_model_id = payload.model_id
  AND (
      managed.name IS DISTINCT FROM payload.model_name
      OR (
          payload.context_window IS NOT NULL
          AND managed.context_window IS DISTINCT FROM payload.context_window
      )
      OR managed.default_pricing_nano_usd IS DISTINCT FROM payload.pricing_nano_usd
      OR (
          NOT managed.input_price_overridden
          AND managed.input_price_nano_usd_per_million
              IS DISTINCT FROM COALESCE(payload.input_price_nano_usd_per_million, 0)
      )
      OR (
          NOT managed.cache_read_price_overridden
          AND managed.cache_read_price_nano_usd_per_million
              IS DISTINCT FROM COALESCE(payload.cache_read_price_nano_usd_per_million, 0)
      )
      OR (
          NOT managed.cache_write_price_overridden
          AND managed.cache_write_price_nano_usd_per_million
              IS DISTINCT FROM COALESCE(payload.cache_write_price_nano_usd_per_million, 0)
      )
      OR (
          NOT managed.output_price_overridden
          AND managed.output_price_nano_usd_per_million
              IS DISTINCT FROM COALESCE(payload.output_price_nano_usd_per_million, 0)
      )
  );
"#;

const UPSERT_SYNC_STATE_SQL: &str = r#"
INSERT INTO model_catalog_sync_state (source, last_synced_at, entry_count, updated_at)
VALUES ('models.dev', NOW(), $1, NOW())
ON CONFLICT (source) DO UPDATE
SET last_synced_at = EXCLUDED.last_synced_at,
    entry_count = EXCLUDED.entry_count,
    updated_at = NOW();
"#;

#[derive(Clone)]
pub struct ModelCatalogRepository {
    database: DatabaseConnection,
}

#[derive(Clone, Debug, Serialize)]
pub struct NewModelCatalogEntry {
    pub provider_id: String,
    pub model_id: String,
    pub model_name: String,
    pub context_window: Option<i64>,
    pub cache_read_price_nano_usd_per_million: Option<i64>,
    pub cache_write_price_nano_usd_per_million: Option<i64>,
    pub input_price_nano_usd_per_million: Option<i64>,
    pub output_price_nano_usd_per_million: Option<i64>,
    pub pricing_nano_usd: ModelPricing,
    pub source_data: serde_json::Value,
}

impl ModelCatalogRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_by_brand(
        &self,
        brand_identifier: &str,
    ) -> Result<Vec<ModelCatalogEntry>, RepositoryError> {
        let Some(provider_id) = self.models_dev_provider_id(brand_identifier).await? else {
            return Ok(Vec::new());
        };
        model_catalog_entry::Entity::find()
            .filter(model_catalog_entry::Column::Source.eq(MODELS_DEV_SOURCE))
            .filter(model_catalog_entry::Column::ProviderId.eq(provider_id))
            .order_by_asc(model_catalog_entry::Column::ModelName)
            .order_by_asc(model_catalog_entry::Column::ModelId)
            .all(&self.database)
            .await?
            .into_iter()
            .map(model_catalog_from_model)
            .collect()
    }

    pub async fn is_models_dev_sync_due(
        &self,
        interval_seconds: u64,
    ) -> Result<bool, RepositoryError> {
        let Some(state) = model_catalog_sync_state::Entity::find_by_id(MODELS_DEV_SOURCE)
            .one(&self.database)
            .await?
        else {
            return Ok(true);
        };
        let elapsed = OffsetDateTime::now_utc() - state.last_synced_at;
        let interval_seconds = i64::try_from(interval_seconds)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;

        Ok(elapsed.whole_seconds() >= interval_seconds)
    }

    pub async fn replace_models_dev_catalog(
        &self,
        entries: &[NewModelCatalogEntry],
    ) -> Result<usize, RepositoryError> {
        if entries.is_empty() {
            return Err(RepositoryError::InvalidData(
                "models.dev catalog must not be empty".to_owned(),
            ));
        }

        let payload = serde_json::to_string(entries)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
        let entry_count = i64::try_from(entries.len())
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?;
        let transaction = self.database.begin().await?;

        transaction
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                UPSERT_CATALOG_SQL,
                [payload.clone().into()],
            ))
            .await?;
        transaction
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                UPDATE_DEFAULT_MODEL_PRICES_SQL,
                [payload.clone().into()],
            ))
            .await?;
        transaction
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                DELETE_STALE_CATALOG_SQL,
                [payload.into()],
            ))
            .await?;
        transaction
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                UPSERT_SYNC_STATE_SQL,
                [entry_count.into()],
            ))
            .await?;
        transaction.commit().await?;

        Ok(entries.len())
    }

    pub async fn find_by_brand_and_model(
        &self,
        brand_identifier: &str,
        model_id: &str,
    ) -> Result<Option<ModelCatalogEntry>, RepositoryError> {
        let Some(provider_id) = self.models_dev_provider_id(brand_identifier).await? else {
            return Ok(None);
        };
        let entry = model_catalog_entry_lookup_query(&provider_id, model_id)
            .one(&self.database)
            .await?;

        entry.map(model_catalog_from_model).transpose()
    }

    async fn models_dev_provider_id(
        &self,
        brand_identifier: &str,
    ) -> Result<Option<String>, RepositoryError> {
        Ok(brand::Entity::find()
            .filter(brand::Column::Identifier.eq(brand_identifier))
            .find_also_related(brand_preset::Entity)
            .one(&self.database)
            .await?
            .and_then(|(_, preset)| preset.and_then(|preset| preset.models_dev_provider_id)))
    }
}

fn model_catalog_from_model(
    model: model_catalog_entry::Model,
) -> Result<ModelCatalogEntry, RepositoryError> {
    Ok(ModelCatalogEntry {
        provider_id: model.provider_id,
        model_id: model.model_id,
        model_name: model.model_name,
        context_window: model.context_window,
        cache_read_price_nano_usd_per_million: model.cache_read_price_nano_usd_per_million,
        cache_write_price_nano_usd_per_million: model.cache_write_price_nano_usd_per_million,
        input_price_nano_usd_per_million: model.input_price_nano_usd_per_million,
        output_price_nano_usd_per_million: model.output_price_nano_usd_per_million,
        pricing: serde_json::from_value(model.pricing_nano_usd)
            .map_err(|error| RepositoryError::InvalidData(error.to_string()))?,
        source_data: model.source_data,
        source_synced_at: domain_timestamp(model.source_synced_at)?,
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

fn model_catalog_entry_lookup_query(
    provider_id: &str,
    model_id: &str,
) -> Select<model_catalog_entry::Entity> {
    model_catalog_entry::Entity::find()
        .filter(model_catalog_entry::Column::Source.eq(MODELS_DEV_SOURCE))
        .filter(model_catalog_entry::Column::ProviderId.eq(provider_id))
        .filter(
            Func::lower(Expr::col(model_catalog_entry::Column::ModelId))
                .eq(model_id.to_lowercase()),
        )
}

#[cfg(test)]
#[path = "../../tests/unit/repository_model_catalog.rs"]
mod tests;

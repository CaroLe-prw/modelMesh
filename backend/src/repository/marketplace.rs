use std::collections::{HashMap, HashSet};

use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, FromQueryResult, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, Set, TransactionTrait, sea_query::Expr,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        MarketplaceBrand, MarketplaceCatalog, MarketplaceMerchant, MarketplaceModel,
        MarketplaceRouteState, MerchantBillingMode, ModelBillingMode, ModelPricing, UserId,
    },
    entity::{
        api_key, api_key_model_route, brand, brand_preset, merchant_channel,
        merchant_model_listing, model,
    },
};

use super::RepositoryError;

const LIVE_CHANNEL_STATUS: &str = "active";
const LIVE_LISTING_REVIEW_STATUS: &str = "approved";
const LIVE_LISTING_STATUS: &str = "published";
const LIVE_MODEL_STATUS: &str = "published";
const VISIBLE_BRAND_STATUS: &str = "active";

#[derive(Clone)]
pub struct MarketplaceRepository {
    database: DatabaseConnection,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MarketplaceRouteMutationResult {
    ApiKeyNotFound,
    MerchantNotFound,
    Updated(MarketplaceRouteState),
}

#[derive(Debug, FromQueryResult)]
struct MarketplaceMerchantRow {
    id: Uuid,
    channel_id: i64,
    name: String,
    description: String,
    billing_mode: String,
    model_billing_mode: String,
    pricing_nano: serde_json::Value,
    model_default_pricing_nano_usd: serde_json::Value,
    model_pricing_overrides_nano_usd: serde_json::Value,
    input_price_nano_usd_per_million: i64,
    output_price_nano_usd_per_million: i64,
    model_input_price_nano_usd_per_million: i64,
    success_rate_basis_points: i32,
    average_latency_ms: i64,
    health_updated_at: OffsetDateTime,
}

impl MarketplaceRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn catalog(&self) -> Result<MarketplaceCatalog, RepositoryError> {
        let models_query = visible_model_query().all(&self.database);
        let model_metrics_query = live_listing_query()
            .select_only()
            .column(merchant_model_listing::Column::ModelId)
            .column_as(
                Expr::cust("COUNT(DISTINCT \"merchant_model_listings\".\"channel_id\")"),
                "merchant_count",
            )
            .column_as(
                Expr::cust("MIN(CASE WHEN \"merchant_model_listings\".\"billing_mode\" = 'token' THEN \"merchant_model_listings\".\"input_price_nano_per_million\" END)"),
                "input_from",
            )
            .column_as(
                Expr::cust("MIN(CASE WHEN \"merchant_model_listings\".\"billing_mode\" = 'token' THEN \"merchant_model_listings\".\"output_price_nano_per_million\" END)"),
                "output_from",
            )
            .column_as(
                Expr::cust("MIN(CASE WHEN \"merchant_model_listings\".\"billing_mode\" = 'request' THEN (\"merchant_model_listings\".\"pricing_nano\"->'base'->>'request')::BIGINT END)"),
                "request_from",
            )
            .group_by(merchant_model_listing::Column::ModelId)
            .into_tuple::<(i64, i64, Option<i64>, Option<i64>, Option<i64>)>()
            .all(&self.database);
        let brand_counts_query = live_listing_query()
            .select_only()
            .column_as(
                Expr::col((brand::Entity, brand::Column::Identifier)),
                "brand_identifier",
            )
            .column_as(
                Expr::cust("COUNT(DISTINCT \"merchant_model_listings\".\"merchant_user_id\")"),
                "merchant_count",
            )
            .group_by(brand::Column::Identifier)
            .into_tuple::<(String, i64)>()
            .all(&self.database);
        let brand_presets_query = brand_preset::Entity::find().all(&self.database);
        let (model_rows, model_metrics, brand_counts, brand_presets) = tokio::try_join!(
            models_query,
            model_metrics_query,
            brand_counts_query,
            brand_presets_query
        )?;
        let model_metrics = model_metrics
            .into_iter()
            .map(
                |(model_id, merchant_count, input_from, output_from, request_from)| {
                    (
                        model_id,
                        (merchant_count, input_from, output_from, request_from),
                    )
                },
            )
            .collect::<HashMap<_, _>>();
        let brand_counts = brand_counts.into_iter().collect::<HashMap<_, _>>();
        let brand_preset_avatars = brand_presets
            .into_iter()
            .map(|preset| (preset.id, preset.avatar_svg))
            .collect::<HashMap<_, _>>();
        let mut brands = Vec::new();
        let mut seen_brands = HashSet::new();
        let mut models = Vec::with_capacity(model_rows.len());

        for (model, brand) in model_rows {
            let brand = brand.ok_or_else(|| {
                RepositoryError::InvalidData("marketplace model brand was not found".to_owned())
            })?;
            if seen_brands.insert(brand.identifier.clone()) {
                brands.push(MarketplaceBrand {
                    merchant_count: count_to_u64(
                        brand_counts.get(&brand.identifier).copied().unwrap_or(0),
                    )?,
                    id: brand.identifier.clone(),
                    name: brand.name,
                    avatar_svg: brand
                        .preset_id
                        .and_then(|preset_id| brand_preset_avatars.get(&preset_id).cloned()),
                    avatar_url: brand.avatar_data_url,
                });
            }
            let billing_mode = ModelBillingMode::parse(&model.billing_mode).ok_or_else(|| {
                RepositoryError::InvalidData(format!(
                    "invalid marketplace model billing mode: {}",
                    model.billing_mode
                ))
            })?;
            let default_pricing = pricing_from_json(model.default_pricing_nano_usd.clone())?;
            let pricing_overrides = pricing_from_json(model.pricing_overrides_nano_usd.clone())?;
            let model_pricing = default_pricing
                .merged_with(&pricing_overrides)
                .for_billing_mode(billing_mode);
            let model_request_price = model_pricing.base.get("request").copied().unwrap_or(0);
            let (merchant_count, input_from, output_from, request_from) = model_metrics
                .get(&model.id)
                .copied()
                .unwrap_or((0, None, None, None));
            models.push(MarketplaceModel {
                id: model.id,
                brand_id: brand.identifier,
                identifier: model.identifier,
                name: model.name,
                billing_mode,
                input_from_nano_usd_per_million: input_from
                    .unwrap_or(model.input_price_nano_usd_per_million),
                output_from_nano_usd_per_million: output_from
                    .unwrap_or(model.output_price_nano_usd_per_million),
                request_from_nano_usd: request_from.unwrap_or(model_request_price),
                merchant_count: count_to_u64(merchant_count)?,
            });
        }

        Ok(MarketplaceCatalog { brands, models })
    }

    pub async fn api_key_belongs_to_user(
        &self,
        user_id: UserId,
        api_key_id: Uuid,
    ) -> Result<bool, RepositoryError> {
        Ok(api_key::Entity::find_by_id(api_key_id)
            .filter(api_key::Column::UserId.eq(user_id))
            .one(&self.database)
            .await?
            .is_some())
    }

    pub async fn merchants(
        &self,
        model_id: i64,
        api_key_id: Option<Uuid>,
    ) -> Result<Vec<MarketplaceMerchant>, RepositoryError> {
        let merchant_rows = merchant_query(model_id)
            .into_model::<MarketplaceMerchantRow>()
            .all(&self.database);
        let routes = async {
            let Some(api_key_id) = api_key_id else {
                return Ok::<_, sea_orm::DbErr>(Vec::new());
            };
            api_key_model_route::Entity::find()
                .filter(api_key_model_route::Column::ApiKeyId.eq(api_key_id))
                .filter(api_key_model_route::Column::ModelId.eq(model_id))
                .all(&self.database)
                .await
        };
        let (merchant_rows, routes) = tokio::try_join!(merchant_rows, routes)?;
        let routes = routes
            .into_iter()
            .map(|route| (route.merchant_model_listing_id, route.is_pinned))
            .collect::<HashMap<_, _>>();

        merchant_rows
            .into_iter()
            .map(|row| {
                let route = routes.get(&row.id).copied();
                let billing_mode =
                    MerchantBillingMode::parse(&row.billing_mode).ok_or_else(|| {
                        RepositoryError::InvalidData(format!(
                            "invalid marketplace merchant billing mode: {}",
                            row.billing_mode
                        ))
                    })?;
                let model_billing_mode = ModelBillingMode::parse(&row.model_billing_mode)
                    .ok_or_else(|| {
                        RepositoryError::InvalidData(format!(
                            "invalid marketplace model billing mode: {}",
                            row.model_billing_mode
                        ))
                    })?;
                let listing_pricing = pricing_from_json(row.pricing_nano)?;
                let model_pricing = pricing_from_json(row.model_default_pricing_nano_usd)?
                    .merged_with(&pricing_from_json(row.model_pricing_overrides_nano_usd)?)
                    .for_billing_mode(model_billing_mode);
                let request_price = listing_pricing.base.get("request").copied().unwrap_or(0);
                let price_multiplier = match (billing_mode, model_billing_mode) {
                    (MerchantBillingMode::Token, ModelBillingMode::Token) => {
                        price_multiplier_basis_points(
                            row.input_price_nano_usd_per_million,
                            row.model_input_price_nano_usd_per_million,
                        )
                    }
                    (MerchantBillingMode::Request, ModelBillingMode::Request) => {
                        price_multiplier_basis_points(
                            request_price,
                            model_pricing.base.get("request").copied().unwrap_or(0),
                        )
                    }
                    _ => None,
                };
                Ok(MarketplaceMerchant {
                    id: row.id.hyphenated().to_string(),
                    channel_id: row.channel_id,
                    name: row.name,
                    description: row.description,
                    billing_mode,
                    input_price_nano_usd_per_million: row.input_price_nano_usd_per_million,
                    output_price_nano_usd_per_million: row.output_price_nano_usd_per_million,
                    request_price_nano_usd: request_price,
                    official_pricing_nano_usd: model_pricing,
                    merchant_pricing_nano_usd: listing_pricing,
                    price_multiplier_basis_points: price_multiplier,
                    success_rate_basis_points: u32::try_from(row.success_rate_basis_points)
                        .map_err(invalid_data)?,
                    average_latency_ms: u64::try_from(row.average_latency_ms)
                        .map_err(invalid_data)?,
                    health_updated_at: domain_timestamp(row.health_updated_at)?,
                    is_in_route: route.is_some(),
                    is_pinned: route.unwrap_or(false),
                })
            })
            .collect()
    }

    pub async fn update_route(
        &self,
        user_id: UserId,
        api_key_id: Uuid,
        model_id: i64,
        merchant_id: Uuid,
        is_in_route: bool,
        is_pinned: bool,
    ) -> Result<MarketplaceRouteMutationResult, RepositoryError> {
        let transaction = self.database.begin().await?;
        let api_key = api_key::Entity::find_by_id(api_key_id)
            .filter(api_key::Column::UserId.eq(user_id))
            .lock_exclusive()
            .one(&transaction)
            .await?;
        if api_key.is_none() {
            transaction.rollback().await?;
            return Ok(MarketplaceRouteMutationResult::ApiKeyNotFound);
        }
        let merchant = live_listing_query()
            .filter(merchant_model_listing::Column::Id.eq(merchant_id))
            .filter(merchant_model_listing::Column::ModelId.eq(model_id))
            .one(&transaction)
            .await?;
        if merchant.is_none() {
            transaction.rollback().await?;
            return Ok(MarketplaceRouteMutationResult::MerchantNotFound);
        }

        let is_in_route = is_in_route || is_pinned;
        if !is_in_route {
            api_key_model_route::Entity::delete_by_id((api_key_id, merchant_id))
                .exec(&transaction)
                .await?;
        } else {
            if is_pinned {
                api_key_model_route::Entity::update_many()
                    .set(api_key_model_route::ActiveModel {
                        is_pinned: Set(false),
                        updated_at: Set(OffsetDateTime::now_utc()),
                        ..Default::default()
                    })
                    .filter(api_key_model_route::Column::ApiKeyId.eq(api_key_id))
                    .filter(api_key_model_route::Column::ModelId.eq(model_id))
                    .filter(api_key_model_route::Column::IsPinned.eq(true))
                    .exec(&transaction)
                    .await?;
            }
            let route = api_key_model_route::Entity::find_by_id((api_key_id, merchant_id))
                .one(&transaction)
                .await?;
            match route {
                Some(route) => {
                    let mut active: api_key_model_route::ActiveModel = route.into();
                    active.model_id = Set(model_id);
                    active.is_pinned = Set(is_pinned);
                    active.updated_at = Set(OffsetDateTime::now_utc());
                    active.update(&transaction).await?;
                }
                None => {
                    api_key_model_route::ActiveModel {
                        api_key_id: Set(api_key_id),
                        model_id: Set(model_id),
                        merchant_model_listing_id: Set(merchant_id),
                        is_pinned: Set(is_pinned),
                        ..Default::default()
                    }
                    .insert(&transaction)
                    .await?;
                }
            }
        }
        transaction.commit().await?;

        Ok(MarketplaceRouteMutationResult::Updated(
            MarketplaceRouteState {
                is_in_route,
                is_pinned: is_in_route && is_pinned,
            },
        ))
    }
}

fn visible_model_query() -> sea_orm::SelectTwo<model::Entity, brand::Entity> {
    model::Entity::find()
        .find_also_related(brand::Entity)
        .filter(model::Column::Status.eq(LIVE_MODEL_STATUS))
        .filter(brand::Column::Status.eq(VISIBLE_BRAND_STATUS))
        .order_by_asc(brand::Column::SortOrder)
        .order_by_asc(brand::Column::Id)
        .order_by_asc(model::Column::SortOrder)
        .order_by_asc(model::Column::Name)
        .order_by_asc(model::Column::Id)
}

fn live_listing_query() -> sea_orm::Select<merchant_model_listing::Entity> {
    merchant_model_listing::Entity::find()
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::MerchantChannel.def(),
        )
        .join(
            JoinType::InnerJoin,
            merchant_model_listing::Relation::Model.def(),
        )
        .join(JoinType::InnerJoin, model::Relation::Brand.def())
        .filter(merchant_model_listing::Column::Status.eq(LIVE_LISTING_STATUS))
        .filter(merchant_model_listing::Column::ReviewStatus.eq(LIVE_LISTING_REVIEW_STATUS))
        .filter(merchant_model_listing::Column::HasApprovedPrice.eq(true))
        .filter(merchant_channel::Column::Status.eq(LIVE_CHANNEL_STATUS))
        .filter(model::Column::Status.eq(LIVE_MODEL_STATUS))
        .filter(brand::Column::Status.eq(VISIBLE_BRAND_STATUS))
}

fn merchant_query(model_id: i64) -> sea_orm::Select<merchant_model_listing::Entity> {
    live_listing_query()
        .filter(merchant_model_listing::Column::ModelId.eq(model_id))
        .select_only()
        .column(merchant_model_listing::Column::Id)
        .column_as(
            Expr::col((merchant_channel::Entity, merchant_channel::Column::PublicId)),
            "channel_id",
        )
        .column_as(
            Expr::col((merchant_channel::Entity, merchant_channel::Column::Name)),
            "name",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::Description,
            )),
            "description",
        )
        .column_as(merchant_model_listing::Column::BillingMode, "billing_mode")
        .column_as(
            Expr::col((model::Entity, model::Column::BillingMode)),
            "model_billing_mode",
        )
        .column_as(merchant_model_listing::Column::PricingNano, "pricing_nano")
        .column_as(
            Expr::col((model::Entity, model::Column::DefaultPricingNanoUsd)),
            "model_default_pricing_nano_usd",
        )
        .column_as(
            Expr::col((model::Entity, model::Column::PricingOverridesNanoUsd)),
            "model_pricing_overrides_nano_usd",
        )
        .column_as(
            merchant_model_listing::Column::InputPriceNanoPerMillion,
            "input_price_nano_usd_per_million",
        )
        .column_as(
            merchant_model_listing::Column::OutputPriceNanoPerMillion,
            "output_price_nano_usd_per_million",
        )
        .column_as(
            Expr::col((model::Entity, model::Column::InputPriceNanoUsdPerMillion)),
            "model_input_price_nano_usd_per_million",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::SuccessRateBasisPoints,
            )),
            "success_rate_basis_points",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::AverageLatencyMs,
            )),
            "average_latency_ms",
        )
        .column_as(
            Expr::col((
                merchant_channel::Entity,
                merchant_channel::Column::UpdatedAt,
            )),
            "health_updated_at",
        )
        .order_by_desc(merchant_channel::Column::SuccessRateBasisPoints)
        .order_by_asc(merchant_model_listing::Column::InputPriceNanoPerMillion)
        .order_by_asc(merchant_channel::Column::PublicId)
        .order_by_asc(merchant_model_listing::Column::Id)
}

fn price_multiplier_basis_points(price: i64, base_price: i64) -> Option<u64> {
    if price < 0 || base_price <= 0 {
        return None;
    }
    let numerator = i128::from(price).checked_mul(10_000)?;
    let rounded = numerator.checked_add(i128::from(base_price) / 2)? / i128::from(base_price);
    u64::try_from(rounded).ok()
}

fn pricing_from_json(value: serde_json::Value) -> Result<ModelPricing, RepositoryError> {
    serde_json::from_value(value).map_err(invalid_data)
}

fn count_to_u64(value: i64) -> Result<u64, RepositoryError> {
    u64::try_from(value).map_err(invalid_data)
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32).map_err(invalid_data)
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

#[cfg(test)]
#[path = "../../tests/unit/repository_marketplace.rs"]
mod tests;

use jiff::Timestamp;
use sea_orm::{DatabaseConnection, EntityTrait, Set, TransactionTrait, sea_query::Expr};
use time::OffsetDateTime;

use crate::{
    domain::{
        ModelPriceReviewSettings, PriceConfiguration, PriceCurrency, PriceExchangeRate,
        PriceSettings,
    },
    entity::{model_price_review_settings, price_settings},
};

use super::RepositoryError;

#[derive(Clone)]
pub struct PriceSettingsRepository {
    database: DatabaseConnection,
}

impl PriceSettingsRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list(&self) -> Result<Vec<PriceSettings>, RepositoryError> {
        let models = price_settings::Entity::find().all(&self.database).await?;
        if models.is_empty() {
            return Err(RepositoryError::InvalidData(
                "price settings must contain at least one currency".to_owned(),
            ));
        }
        let mut settings = models
            .into_iter()
            .map(price_settings_from_model)
            .collect::<Result<Vec<_>, _>>()?;
        if !settings
            .iter()
            .any(|setting| setting.currency() == PriceCurrency::Usd)
        {
            return Err(RepositoryError::InvalidData(
                "price settings must contain the default USD currency".to_owned(),
            ));
        }
        settings.sort_by_key(|setting| {
            (
                setting.currency() != PriceCurrency::Usd,
                setting.currency().as_str(),
            )
        });
        Ok(settings)
    }

    pub async fn get(&self) -> Result<PriceConfiguration, RepositoryError> {
        Ok(PriceConfiguration {
            rates: self.list().await?,
            review: self.review_settings().await?,
        })
    }

    pub async fn review_settings(&self) -> Result<ModelPriceReviewSettings, RepositoryError> {
        let model = model_price_review_settings::Entity::find_by_id(1_i16)
            .one(&self.database)
            .await?
            .ok_or_else(|| {
                RepositoryError::InvalidData(
                    "model price review settings singleton was not found".to_owned(),
                )
            })?;
        model_price_review_settings_from_model(model)
    }

    pub async fn replace(
        &self,
        exchange_rates: &[PriceExchangeRate],
        price_increase_review_threshold_bps: i64,
        approved_price_effective_delay_hours: i32,
    ) -> Result<PriceConfiguration, RepositoryError> {
        if exchange_rates.is_empty()
            || !exchange_rates
                .iter()
                .any(|rate| rate.currency() == PriceCurrency::Usd)
        {
            return Err(RepositoryError::InvalidData(
                "price settings replacement must contain the default USD currency".to_owned(),
            ));
        }

        let transaction = self.database.begin().await?;
        price_settings::Entity::delete_many()
            .exec(&transaction)
            .await?;
        price_settings::Entity::insert_many(exchange_rates.iter().map(|exchange_rate| {
            price_settings::ActiveModel {
                price_currency: Set(exchange_rate.currency().as_str().to_owned()),
                exchange_rate_nano_per_usd: Set(exchange_rate.nano_units_per_usd()),
                ..Default::default()
            }
        }))
        .exec(&transaction)
        .await?;
        model_price_review_settings::Entity::update_many()
            .set(model_price_review_settings::ActiveModel {
                price_increase_review_threshold_bps: Set(price_increase_review_threshold_bps),
                approved_price_effective_delay_hours: Set(approved_price_effective_delay_hours),
                ..Default::default()
            })
            .col_expr(
                model_price_review_settings::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .exec(&transaction)
            .await?;
        transaction.commit().await?;

        self.get().await
    }
}

fn model_price_review_settings_from_model(
    model: model_price_review_settings::Model,
) -> Result<ModelPriceReviewSettings, RepositoryError> {
    Ok(ModelPriceReviewSettings {
        approved_price_effective_delay_hours: model.approved_price_effective_delay_hours,
        price_increase_review_threshold_bps: model.price_increase_review_threshold_bps,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn price_settings_from_model(
    model: price_settings::Model,
) -> Result<PriceSettings, RepositoryError> {
    let currency = PriceCurrency::parse(&model.price_currency).ok_or_else(|| {
        RepositoryError::InvalidData(format!(
            "invalid price settings currency: {}",
            model.price_currency
        ))
    })?;
    let exchange_rate = PriceExchangeRate::new(currency, model.exchange_rate_nano_per_usd)
        .ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "invalid price settings exchange rate: {} {}",
                model.price_currency, model.exchange_rate_nano_per_usd
            ))
        })?;
    Ok(PriceSettings {
        exchange_rate,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

use jiff::Timestamp;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set, TransactionTrait,
    sea_query::Expr,
};
use time::OffsetDateTime;

use crate::{
    domain::{
        MerchantSettlementMethod, MerchantSettlementNetwork, MerchantSettlementSettings, UserId,
    },
    entity::{merchant_settlement_method_setting, merchant_settlement_network_setting},
};

use super::RepositoryError;

#[derive(Clone)]
pub struct MerchantSettlementSettingsRepository {
    database: DatabaseConnection,
}

impl MerchantSettlementSettingsRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn get(&self) -> Result<MerchantSettlementSettings, RepositoryError> {
        let methods = merchant_settlement_method_setting::Entity::find()
            .order_by_asc(merchant_settlement_method_setting::Column::SortOrder)
            .all(&self.database)
            .await?;
        let networks = merchant_settlement_network_setting::Entity::find()
            .order_by_asc(merchant_settlement_network_setting::Column::SortOrder)
            .all(&self.database)
            .await?;

        settings_from_models(methods, networks)
    }

    pub async fn replace(
        &self,
        requester_id: UserId,
        enabled_methods: &[MerchantSettlementMethod],
        enabled_networks: &[MerchantSettlementNetwork],
    ) -> Result<MerchantSettlementSettings, RepositoryError> {
        let transaction = self.database.begin().await?;
        let method_update = merchant_settlement_method_setting::Entity::update_many()
            .set(merchant_settlement_method_setting::ActiveModel {
                is_enabled: Set(false),
                updated_by: Set(Some(requester_id)),
                ..Default::default()
            })
            .col_expr(
                merchant_settlement_method_setting::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .exec(&transaction)
            .await?;
        if method_update.rows_affected != MerchantSettlementMethod::CONFIGURABLE.len() as u64 {
            return Err(RepositoryError::InvalidData(
                "settlement method settings are incomplete".to_owned(),
            ));
        }
        if !enabled_methods.is_empty() {
            merchant_settlement_method_setting::Entity::update_many()
                .set(merchant_settlement_method_setting::ActiveModel {
                    is_enabled: Set(true),
                    ..Default::default()
                })
                .filter(
                    merchant_settlement_method_setting::Column::Method
                        .is_in(enabled_methods.iter().map(|method| method.as_str())),
                )
                .exec(&transaction)
                .await?;
        }

        let network_update = merchant_settlement_network_setting::Entity::update_many()
            .set(merchant_settlement_network_setting::ActiveModel {
                is_enabled: Set(false),
                updated_by: Set(Some(requester_id)),
                ..Default::default()
            })
            .col_expr(
                merchant_settlement_network_setting::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .exec(&transaction)
            .await?;
        if network_update.rows_affected != MerchantSettlementNetwork::ALL.len() as u64 {
            return Err(RepositoryError::InvalidData(
                "settlement network settings are incomplete".to_owned(),
            ));
        }
        if !enabled_networks.is_empty() {
            merchant_settlement_network_setting::Entity::update_many()
                .set(merchant_settlement_network_setting::ActiveModel {
                    is_enabled: Set(true),
                    ..Default::default()
                })
                .filter(
                    merchant_settlement_network_setting::Column::Network
                        .is_in(enabled_networks.iter().map(|network| network.as_str())),
                )
                .exec(&transaction)
                .await?;
        }
        transaction.commit().await?;

        self.get().await
    }
}

fn settings_from_models(
    methods: Vec<merchant_settlement_method_setting::Model>,
    networks: Vec<merchant_settlement_network_setting::Model>,
) -> Result<MerchantSettlementSettings, RepositoryError> {
    if methods.len() != MerchantSettlementMethod::CONFIGURABLE.len()
        || networks.len() != MerchantSettlementNetwork::ALL.len()
    {
        return Err(RepositoryError::InvalidData(
            "merchant settlement settings are incomplete".to_owned(),
        ));
    }

    let updated_at = methods
        .iter()
        .map(|setting| setting.updated_at)
        .chain(networks.iter().map(|setting| setting.updated_at))
        .max()
        .ok_or_else(|| {
            RepositoryError::InvalidData("merchant settlement settings are empty".to_owned())
        })?;
    let enabled_methods = methods
        .into_iter()
        .map(|setting| {
            let method =
                MerchantSettlementMethod::from_database(&setting.method).ok_or_else(|| {
                    RepositoryError::InvalidData(format!(
                        "unknown settlement method setting `{}`",
                        setting.method
                    ))
                })?;
            Ok(setting.is_enabled.then_some(method))
        })
        .collect::<Result<Vec<_>, RepositoryError>>()?
        .into_iter()
        .flatten()
        .collect();
    let enabled_networks = networks
        .into_iter()
        .map(|setting| {
            let network =
                MerchantSettlementNetwork::from_database(&setting.network).ok_or_else(|| {
                    RepositoryError::InvalidData(format!(
                        "unknown settlement network setting `{}`",
                        setting.network
                    ))
                })?;
            Ok(setting.is_enabled.then_some(network))
        })
        .collect::<Result<Vec<_>, RepositoryError>>()?
        .into_iter()
        .flatten()
        .collect();

    Ok(MerchantSettlementSettings {
        enabled_methods,
        enabled_networks,
        updated_at: domain_timestamp(updated_at)?,
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_settlement_settings.rs"]
mod tests;

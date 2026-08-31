use jiff::Timestamp;
use sea_orm::{DatabaseConnection, EntityTrait, Set, sea_query::Expr};
use time::OffsetDateTime;

use crate::{
    domain::{
        MerchantSettlementMethod, MerchantSettlementNetwork, MerchantSettlementSettings,
        SystemFinanceSettings, SystemSettings, UserId,
    },
    entity::system_setting,
};

use super::RepositoryError;

#[derive(Clone)]
pub struct SystemSettingsRepository {
    database: DatabaseConnection,
}

pub struct UpdateSystemSettingsRecord {
    pub registration_enabled: bool,
    pub withdrawal_minimum_microusd: i64,
    pub withdrawal_fee_bps: i32,
    pub platform_fee_bps: i32,
    pub enabled_methods: Vec<MerchantSettlementMethod>,
    pub enabled_networks: Vec<MerchantSettlementNetwork>,
}

impl SystemSettingsRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn get(&self) -> Result<SystemSettings, RepositoryError> {
        let model = system_setting::Entity::find_by_id(1_i16)
            .one(&self.database)
            .await?
            .ok_or_else(|| {
                RepositoryError::InvalidData("system settings singleton was not found".to_owned())
            })?;
        system_settings_from_model(model)
    }

    pub async fn update(
        &self,
        requester_id: UserId,
        record: UpdateSystemSettingsRecord,
    ) -> Result<SystemSettings, RepositoryError> {
        let enabled_methods = record.enabled_methods;
        let enabled_networks = record.enabled_networks;
        let model = system_setting::Entity::update_many()
            .set(system_setting::ActiveModel {
                registration_enabled: Set(record.registration_enabled),
                withdrawal_minimum_microusd: Set(record.withdrawal_minimum_microusd),
                withdrawal_fee_bps: Set(record.withdrawal_fee_bps),
                platform_fee_bps: Set(record.platform_fee_bps),
                bank_enabled: Set(enabled_methods.contains(&MerchantSettlementMethod::Bank)),
                alipay_enabled: Set(enabled_methods.contains(&MerchantSettlementMethod::Alipay)),
                usdt_enabled: Set(enabled_methods.contains(&MerchantSettlementMethod::Usdt)),
                trc20_enabled: Set(enabled_networks.contains(&MerchantSettlementNetwork::Trc20)),
                erc20_enabled: Set(enabled_networks.contains(&MerchantSettlementNetwork::Erc20)),
                bep20_enabled: Set(enabled_networks.contains(&MerchantSettlementNetwork::Bep20)),
                polygon_enabled: Set(
                    enabled_networks.contains(&MerchantSettlementNetwork::Polygon),
                ),
                updated_by: Set(Some(requester_id)),
                ..Default::default()
            })
            .col_expr(system_setting::Column::UpdatedAt, Expr::current_timestamp())
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next()
            .ok_or_else(|| {
                RepositoryError::InvalidData("system settings singleton was not found".to_owned())
            })?;

        system_settings_from_model(model)
    }
}

fn system_settings_from_model(
    model: system_setting::Model,
) -> Result<SystemSettings, RepositoryError> {
    let updated_at = domain_timestamp(model.updated_at)?;
    let mut enabled_methods = Vec::with_capacity(MerchantSettlementMethod::CONFIGURABLE.len());
    if model.bank_enabled {
        enabled_methods.push(MerchantSettlementMethod::Bank);
    }
    if model.alipay_enabled {
        enabled_methods.push(MerchantSettlementMethod::Alipay);
    }
    if model.usdt_enabled {
        enabled_methods.push(MerchantSettlementMethod::Usdt);
    }
    let mut enabled_networks = Vec::with_capacity(MerchantSettlementNetwork::ALL.len());
    if model.trc20_enabled {
        enabled_networks.push(MerchantSettlementNetwork::Trc20);
    }
    if model.erc20_enabled {
        enabled_networks.push(MerchantSettlementNetwork::Erc20);
    }
    if model.bep20_enabled {
        enabled_networks.push(MerchantSettlementNetwork::Bep20);
    }
    if model.polygon_enabled {
        enabled_networks.push(MerchantSettlementNetwork::Polygon);
    }

    Ok(SystemSettings {
        registration_enabled: model.registration_enabled,
        finance: SystemFinanceSettings {
            withdrawal_minimum_microusd: model.withdrawal_minimum_microusd,
            withdrawal_fee_bps: model.withdrawal_fee_bps,
            platform_fee_bps: model.platform_fee_bps,
        },
        settlement: MerchantSettlementSettings {
            enabled_methods,
            enabled_networks,
            updated_at,
        },
        updated_at,
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

#[cfg(test)]
#[path = "../../tests/unit/repository_system_settings.rs"]
mod tests;

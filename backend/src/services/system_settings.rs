use std::collections::HashSet;

use crate::{
    domain::{
        AccountRole, MerchantSettlementMethod, MerchantSettlementNetwork,
        MerchantSettlementSettings, SystemSettings, UserId,
    },
    repository::{SystemSettingsRepository, UpdateSystemSettingsRecord},
};

use super::authorization::{require_admin, require_merchant};

const MAX_WITHDRAWAL_MINIMUM_MICROUSD: i64 = 1_000_000_000_000_000;
const MAX_RATE_BPS: i64 = 10_000;

#[derive(Clone)]
pub struct SystemSettingsService {
    repository: SystemSettingsRepository,
}

pub struct UpdateSystemSettings {
    pub registration_enabled: bool,
    pub withdrawal_minimum_usd: String,
    pub withdrawal_fee_percent: String,
    pub platform_fee_percent: String,
    pub enabled_methods: Vec<MerchantSettlementMethod>,
    pub enabled_networks: Vec<MerchantSettlementNetwork>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SystemSettingsServiceError {
    Forbidden,
    InvalidInput,
    Internal,
}

impl SystemSettingsService {
    pub fn new(repository: SystemSettingsRepository) -> Self {
        Self { repository }
    }

    pub async fn get_for_admin(
        &self,
        requester_role: AccountRole,
    ) -> Result<SystemSettings, SystemSettingsServiceError> {
        require_admin(requester_role, SystemSettingsServiceError::Forbidden)?;
        self.load("admin_lookup").await
    }

    pub async fn get_for_merchant(
        &self,
        requester_role: AccountRole,
    ) -> Result<MerchantSettlementSettings, SystemSettingsServiceError> {
        require_merchant(requester_role, SystemSettingsServiceError::Forbidden)?;
        self.load("merchant_lookup")
            .await
            .map(|settings| settings.settlement)
    }

    pub async fn update(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        input: UpdateSystemSettings,
    ) -> Result<SystemSettings, SystemSettingsServiceError> {
        require_admin(requester_role, SystemSettingsServiceError::Forbidden)?;
        let (enabled_methods, enabled_networks) =
            validate_settlement_options(input.enabled_methods, input.enabled_networks)?;
        let record = UpdateSystemSettingsRecord {
            registration_enabled: input.registration_enabled,
            withdrawal_minimum_microusd: parse_scaled_decimal(
                &input.withdrawal_minimum_usd,
                6,
                MAX_WITHDRAWAL_MINIMUM_MICROUSD,
                false,
            )?,
            withdrawal_fee_bps: parse_scaled_decimal(
                &input.withdrawal_fee_percent,
                2,
                MAX_RATE_BPS,
                true,
            )? as i32,
            platform_fee_bps: parse_scaled_decimal(
                &input.platform_fee_percent,
                2,
                MAX_RATE_BPS,
                true,
            )? as i32,
            enabled_methods,
            enabled_networks,
        };

        self.repository
            .update(requester_id, record)
            .await
            .map_err(|error| {
                tracing::error!(requester_id, %error, "system settings update failed");
                SystemSettingsServiceError::Internal
            })
    }

    async fn load(
        &self,
        operation: &'static str,
    ) -> Result<SystemSettings, SystemSettingsServiceError> {
        self.repository.get().await.map_err(|error| {
            tracing::error!(operation, %error, "system settings lookup failed");
            SystemSettingsServiceError::Internal
        })
    }
}

fn validate_settlement_options(
    enabled_methods: Vec<MerchantSettlementMethod>,
    enabled_networks: Vec<MerchantSettlementNetwork>,
) -> Result<
    (
        Vec<MerchantSettlementMethod>,
        Vec<MerchantSettlementNetwork>,
    ),
    SystemSettingsServiceError,
> {
    let method_count = enabled_methods.len();
    let network_count = enabled_networks.len();
    let methods = enabled_methods.into_iter().collect::<HashSet<_>>();
    let networks = enabled_networks.into_iter().collect::<HashSet<_>>();
    if methods.len() != method_count
        || networks.len() != network_count
        || methods.len() > MerchantSettlementMethod::CONFIGURABLE.len()
        || networks.len() > MerchantSettlementNetwork::ALL.len()
        || (methods.contains(&MerchantSettlementMethod::Usdt) && networks.is_empty())
    {
        return Err(SystemSettingsServiceError::InvalidInput);
    }

    Ok((
        MerchantSettlementMethod::CONFIGURABLE
            .into_iter()
            .filter(|method| methods.contains(method))
            .collect(),
        MerchantSettlementNetwork::ALL
            .into_iter()
            .filter(|network| networks.contains(network))
            .collect(),
    ))
}

fn parse_scaled_decimal(
    value: &str,
    decimal_places: u32,
    maximum: i64,
    allow_zero: bool,
) -> Result<i64, SystemSettingsServiceError> {
    let value = value.trim();
    if value.is_empty() || value.starts_with(['+', '-']) || value.contains(['e', 'E']) {
        return Err(SystemSettingsServiceError::InvalidInput);
    }
    let (whole, fraction) = value.split_once('.').unwrap_or((value, ""));
    if whole.is_empty()
        || !whole.bytes().all(|digit| digit.is_ascii_digit())
        || !fraction.bytes().all(|digit| digit.is_ascii_digit())
        || fraction.len() > decimal_places as usize
    {
        return Err(SystemSettingsServiceError::InvalidInput);
    }
    let scale = 10_i64
        .checked_pow(decimal_places)
        .ok_or(SystemSettingsServiceError::InvalidInput)?;
    let whole = whole
        .parse::<i64>()
        .map_err(|_| SystemSettingsServiceError::InvalidInput)?;
    let fraction = if fraction.is_empty() {
        0
    } else {
        fraction
            .parse::<i64>()
            .map_err(|_| SystemSettingsServiceError::InvalidInput)?
            .checked_mul(
                10_i64
                    .checked_pow(decimal_places - fraction.len() as u32)
                    .ok_or(SystemSettingsServiceError::InvalidInput)?,
            )
            .ok_or(SystemSettingsServiceError::InvalidInput)?
    };
    let scaled = whole
        .checked_mul(scale)
        .and_then(|value| value.checked_add(fraction))
        .ok_or(SystemSettingsServiceError::InvalidInput)?;
    ((allow_zero || scaled > 0) && scaled <= maximum)
        .then_some(scaled)
        .ok_or(SystemSettingsServiceError::InvalidInput)
}

#[cfg(test)]
#[path = "../../tests/unit/services_system_settings.rs"]
mod tests;

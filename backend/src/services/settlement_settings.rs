use std::collections::HashSet;

use crate::{
    domain::{
        AccountRole, MerchantSettlementMethod, MerchantSettlementNetwork,
        MerchantSettlementSettings, UserId,
    },
    repository::MerchantSettlementSettingsRepository,
};

use super::authorization::{require_admin, require_merchant};

#[derive(Clone)]
pub struct MerchantSettlementSettingsService {
    repository: MerchantSettlementSettingsRepository,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantSettlementSettingsServiceError {
    Forbidden,
    InvalidInput,
    Internal,
}

impl MerchantSettlementSettingsService {
    pub fn new(repository: MerchantSettlementSettingsRepository) -> Self {
        Self { repository }
    }

    pub async fn get_for_admin(
        &self,
        requester_role: AccountRole,
    ) -> Result<MerchantSettlementSettings, MerchantSettlementSettingsServiceError> {
        require_admin(
            requester_role,
            MerchantSettlementSettingsServiceError::Forbidden,
        )?;
        self.load("admin_lookup").await
    }

    pub async fn get_for_merchant(
        &self,
        requester_role: AccountRole,
    ) -> Result<MerchantSettlementSettings, MerchantSettlementSettingsServiceError> {
        require_merchant(
            requester_role,
            MerchantSettlementSettingsServiceError::Forbidden,
        )?;
        self.load("merchant_lookup").await
    }

    pub async fn update(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        enabled_methods: Vec<MerchantSettlementMethod>,
        enabled_networks: Vec<MerchantSettlementNetwork>,
    ) -> Result<MerchantSettlementSettings, MerchantSettlementSettingsServiceError> {
        require_admin(
            requester_role,
            MerchantSettlementSettingsServiceError::Forbidden,
        )?;
        let (enabled_methods, enabled_networks) =
            validate_settings(enabled_methods, enabled_networks)?;
        self.repository
            .replace(requester_id, &enabled_methods, &enabled_networks)
            .await
            .map_err(|error| {
                tracing::error!(requester_id, %error, "merchant settlement settings update failed");
                MerchantSettlementSettingsServiceError::Internal
            })
    }

    async fn load(
        &self,
        operation: &'static str,
    ) -> Result<MerchantSettlementSettings, MerchantSettlementSettingsServiceError> {
        self.repository.get().await.map_err(|error| {
            tracing::error!(operation, %error, "merchant settlement settings lookup failed");
            MerchantSettlementSettingsServiceError::Internal
        })
    }
}

fn validate_settings(
    enabled_methods: Vec<MerchantSettlementMethod>,
    enabled_networks: Vec<MerchantSettlementNetwork>,
) -> Result<
    (
        Vec<MerchantSettlementMethod>,
        Vec<MerchantSettlementNetwork>,
    ),
    MerchantSettlementSettingsServiceError,
> {
    let method_count = enabled_methods.len();
    let network_count = enabled_networks.len();
    let methods = enabled_methods.into_iter().collect::<HashSet<_>>();
    let networks = enabled_networks.into_iter().collect::<HashSet<_>>();
    if methods.len() != method_count
        || networks.len() != network_count
        || methods.len() > MerchantSettlementMethod::CONFIGURABLE.len()
        || networks.len() > MerchantSettlementNetwork::ALL.len()
        || !methods
            .iter()
            .all(|method| MerchantSettlementMethod::CONFIGURABLE.contains(method))
        || (methods.contains(&MerchantSettlementMethod::Usdt) && networks.is_empty())
    {
        return Err(MerchantSettlementSettingsServiceError::InvalidInput);
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

#[cfg(test)]
#[path = "../../tests/unit/services_settlement_settings.rs"]
mod tests;

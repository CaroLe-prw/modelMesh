use crate::{
    domain::{AccountRole, BrandPreset},
    repository::BrandPresetRepository,
};

use super::authorization::require_admin;

#[derive(Clone)]
pub struct BrandPresetService {
    repository: BrandPresetRepository,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BrandPresetServiceError {
    Forbidden,
    Internal,
}

impl BrandPresetService {
    pub fn new(repository: BrandPresetRepository) -> Self {
        Self { repository }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
    ) -> Result<Vec<BrandPreset>, BrandPresetServiceError> {
        require_admin(requester_role, BrandPresetServiceError::Forbidden)?;
        self.repository
            .list_enabled()
            .await
            .map_err(|_| BrandPresetServiceError::Internal)
    }
}

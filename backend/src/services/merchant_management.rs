use std::collections::HashSet;

use crate::{
    domain::{
        AccountRole, ManagedMerchant, ManagedMerchantStatus, MerchantAccessStatus,
        MerchantReviewDecision, Page, Pagination, UserId,
    },
    repository::{
        ManagedMerchantReviewResult, MerchantManagementRepository, MerchantSearch,
        RepositoryConflict, RepositoryError, ReviewManagedMerchantRecord,
        UpdateManagedMerchantRecord,
    },
};

use super::{
    AuthService, auth::normalize_email, authorization::require_admin,
    management_search::management_search,
};

const MAX_MERCHANT_NAME_LENGTH: usize = 120;
const MAX_BATCH_MERCHANTS: usize = 100;
const MAX_REVIEW_NOTE_LENGTH: usize = 1_000;
const MAX_USER_REQUEST_LIMIT: i64 = u32::MAX as i64;
const MIN_MERCHANT_NAME_LENGTH: usize = 2;

#[derive(Clone)]
pub struct MerchantManagementService {
    auth_service: AuthService,
    repository: MerchantManagementRepository,
}

pub struct UpdateManagedMerchant {
    pub name: String,
    pub email: String,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

pub struct ReviewManagedMerchant {
    pub decision: MerchantReviewDecision,
    pub review_note: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantManagementServiceError {
    Forbidden,
    InvalidInput,
    EmailAlreadyExists,
    NotFound,
    InvalidState,
    Internal,
}

impl MerchantManagementService {
    pub fn new(repository: MerchantManagementRepository, auth_service: AuthService) -> Self {
        Self {
            auth_service,
            repository,
        }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        pagination: Pagination,
        query: Option<String>,
        status: Option<ManagedMerchantStatus>,
    ) -> Result<Page<ManagedMerchant>, MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        let search =
            management_search(query).map_err(|()| MerchantManagementServiceError::InvalidInput)?;

        self.repository
            .list(
                &MerchantSearch {
                    exact_user_id: search.exact_user_id,
                    pattern: search.pattern,
                    status,
                },
                pagination,
            )
            .await
            .map_err(|error| {
                tracing::error!(%error, "managed merchant list failed");
                MerchantManagementServiceError::Internal
            })
    }

    pub async fn get(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
    ) -> Result<ManagedMerchant, MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(MerchantManagementServiceError::InvalidInput);
        }

        self.repository
            .find_by_id(user_id)
            .await
            .map_err(|error| map_mutation_error(error, user_id, "get"))?
            .ok_or(MerchantManagementServiceError::NotFound)
    }

    pub async fn update(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
        update: UpdateManagedMerchant,
    ) -> Result<(), MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        let (name, email, concurrency_limit, rpm_limit) = validate_update(user_id, update)?;
        let updated = self
            .repository
            .update(
                user_id,
                UpdateManagedMerchantRecord {
                    name,
                    email,
                    concurrency_limit,
                    rpm_limit,
                },
            )
            .await
            .map_err(|error| map_mutation_error(error, user_id, "update"))?;
        if !updated {
            return Err(MerchantManagementServiceError::NotFound);
        }

        self.invalidate_user(user_id).await
    }

    pub async fn review(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        user_id: UserId,
        review: ReviewManagedMerchant,
    ) -> Result<(), MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        let review_note = validate_review(requester_id, user_id, &review)?;
        let decision = review.decision;
        match self
            .repository
            .review(
                user_id,
                ReviewManagedMerchantRecord {
                    reviewer_user_id: requester_id,
                    decision,
                    review_note,
                },
            )
            .await
            .map_err(|error| map_mutation_error(error, user_id, "review"))?
        {
            ManagedMerchantReviewResult::Reviewed => {}
            ManagedMerchantReviewResult::NotFound => {
                return Err(MerchantManagementServiceError::NotFound);
            }
            ManagedMerchantReviewResult::InvalidState => {
                return Err(MerchantManagementServiceError::InvalidState);
            }
        }

        if decision == MerchantReviewDecision::Approve {
            self.invalidate_user(user_id).await?;
        }

        Ok(())
    }

    pub async fn update_status(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
        status: MerchantAccessStatus,
    ) -> Result<(), MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(MerchantManagementServiceError::InvalidInput);
        }

        let updated = self
            .repository
            .update_status(user_id, status)
            .await
            .map_err(|error| map_mutation_error(error, user_id, "update_status"))?;
        if !updated {
            return Err(MerchantManagementServiceError::NotFound);
        }

        self.invalidate_user(user_id).await
    }

    pub async fn update_status_batch(
        &self,
        requester_role: AccountRole,
        user_ids: Vec<UserId>,
        status: MerchantAccessStatus,
    ) -> Result<u64, MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        let user_ids = validate_batch_user_ids(user_ids)?;
        let updated_user_ids = self
            .repository
            .update_status_batch(&user_ids, status)
            .await
            .map_err(|error| map_batch_mutation_error(error, "update_status_batch"))?;
        self.invalidate_users(&updated_user_ids).await?;

        u64::try_from(updated_user_ids.len()).map_err(|_| MerchantManagementServiceError::Internal)
    }

    pub async fn remove(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
    ) -> Result<(), MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(MerchantManagementServiceError::InvalidInput);
        }
        let removed = self
            .repository
            .remove(user_id)
            .await
            .map_err(|error| map_mutation_error(error, user_id, "remove"))?;
        if !removed {
            return Err(MerchantManagementServiceError::NotFound);
        }

        self.invalidate_user(user_id).await
    }

    pub async fn remove_batch(
        &self,
        requester_role: AccountRole,
        user_ids: Vec<UserId>,
    ) -> Result<u64, MerchantManagementServiceError> {
        require_admin(requester_role, MerchantManagementServiceError::Forbidden)?;
        let user_ids = validate_batch_user_ids(user_ids)?;
        let removed_user_ids = self
            .repository
            .remove_batch(&user_ids)
            .await
            .map_err(|error| map_batch_mutation_error(error, "remove_batch"))?;
        self.invalidate_users(&removed_user_ids).await?;

        u64::try_from(removed_user_ids.len()).map_err(|_| MerchantManagementServiceError::Internal)
    }

    async fn invalidate_users(
        &self,
        user_ids: &[UserId],
    ) -> Result<(), MerchantManagementServiceError> {
        for user_id in user_ids {
            self.invalidate_user(*user_id).await?;
        }

        Ok(())
    }

    async fn invalidate_user(&self, user_id: UserId) -> Result<(), MerchantManagementServiceError> {
        self.auth_service
            .invalidate_user(user_id)
            .await
            .map_err(|_| MerchantManagementServiceError::Internal)
    }
}

fn validate_batch_user_ids(
    user_ids: Vec<UserId>,
) -> Result<Vec<UserId>, MerchantManagementServiceError> {
    if user_ids.is_empty()
        || user_ids.len() > MAX_BATCH_MERCHANTS
        || user_ids.iter().any(|user_id| *user_id <= 0)
    {
        return Err(MerchantManagementServiceError::InvalidInput);
    }

    let mut seen = HashSet::with_capacity(user_ids.len());
    Ok(user_ids
        .into_iter()
        .filter(|user_id| seen.insert(*user_id))
        .collect())
}

fn validate_update(
    user_id: UserId,
    update: UpdateManagedMerchant,
) -> Result<(String, String, i64, i64), MerchantManagementServiceError> {
    let name = update.name.trim().to_owned();
    let name_length = name.chars().count();
    let email =
        normalize_email(&update.email).ok_or(MerchantManagementServiceError::InvalidInput)?;

    if user_id <= 0
        || !(MIN_MERCHANT_NAME_LENGTH..=MAX_MERCHANT_NAME_LENGTH).contains(&name_length)
        || name.chars().any(char::is_control)
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&update.concurrency_limit)
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&update.rpm_limit)
    {
        return Err(MerchantManagementServiceError::InvalidInput);
    }

    Ok((name, email, update.concurrency_limit, update.rpm_limit))
}

fn validate_review(
    requester_id: UserId,
    user_id: UserId,
    review: &ReviewManagedMerchant,
) -> Result<String, MerchantManagementServiceError> {
    let review_note = review.review_note.trim().to_owned();
    if requester_id <= 0
        || user_id <= 0
        || requester_id == user_id
        || review_note.chars().count() > MAX_REVIEW_NOTE_LENGTH
        || review_note.contains('\0')
    {
        return Err(MerchantManagementServiceError::InvalidInput);
    }

    Ok(review_note)
}

fn map_mutation_error(
    error: RepositoryError,
    user_id: UserId,
    operation: &'static str,
) -> MerchantManagementServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::UserEmail)
    ) {
        return MerchantManagementServiceError::EmailAlreadyExists;
    }

    tracing::error!(error = %error, managed_merchant_id = user_id, operation, "managed merchant mutation failed");
    MerchantManagementServiceError::Internal
}

fn map_batch_mutation_error(
    error: RepositoryError,
    operation: &'static str,
) -> MerchantManagementServiceError {
    tracing::error!(error = %error, operation, "managed merchant batch mutation failed");
    MerchantManagementServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_management.rs"]
mod tests;

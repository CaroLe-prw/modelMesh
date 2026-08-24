use crate::{
    domain::{
        AccountRole, AccountStatus, ManagedUser, ManagedUserBalanceAdjustmentKind,
        ManagedUserBalanceAdjustmentPage, ManagedUserSort, Page, Pagination, UserId,
    },
    repository::{
        CreateManagedUserRecord, ManagedUserBalanceAdjustmentResult, ManagedUserDeletionResult,
        RepositoryConflict, RepositoryError, UpdateManagedUserRecord, UserManagementRepository,
        UserSearch,
    },
};

use super::{
    AuthService,
    auth::{default_username, normalize_email, validate_password},
    authorization::require_admin,
    management_search::management_search,
};

const MAX_SAFE_JSON_INTEGER: i64 = 9_007_199_254_740_991;
const MAX_USER_REQUEST_LIMIT: i64 = u32::MAX as i64;
const MAX_USERNAME_LENGTH: usize = 64;
const MAX_USER_NOTES_LENGTH: usize = 1_000;
const MAX_BALANCE_ADJUSTMENT_NOTES_LENGTH: usize = 1_000;
const MAX_USERS_PER_DELETE: usize = 50;

#[derive(Clone)]
pub struct UserManagementService {
    repository: UserManagementRepository,
    auth_service: AuthService,
}

pub struct UpdateManagedUser {
    pub email: String,
    pub password: Option<String>,
    pub username: String,
    pub notes: String,
    pub role: AccountRole,
    pub status: AccountStatus,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

pub struct CreateManagedUser {
    pub email: String,
    pub password: String,
    pub username: Option<String>,
    pub role: AccountRole,
    pub balance_microusd: i64,
    pub concurrency_limit: i64,
    pub rpm_limit: i64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UserManagementServiceError {
    Forbidden,
    InvalidEmail,
    InvalidPassword,
    EmailAlreadyExists,
    InvalidInput,
    InvalidBalanceAdjustment,
    DeleteConflict,
    NotFound,
    Internal,
}

impl UserManagementService {
    pub fn new(repository: UserManagementRepository, auth_service: AuthService) -> Self {
        Self {
            repository,
            auth_service,
        }
    }

    pub async fn list(
        &self,
        requester_role: AccountRole,
        pagination: Pagination,
        query: Option<String>,
        role: Option<AccountRole>,
        status: Option<AccountStatus>,
        sort: ManagedUserSort,
    ) -> Result<Page<ManagedUser>, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        let search =
            management_search(query).map_err(|()| UserManagementServiceError::InvalidInput)?;

        self.repository
            .list(
                &UserSearch {
                    exact_user_id: search.exact_user_id,
                    pattern: search.pattern,
                    role,
                    status,
                },
                pagination,
                sort,
            )
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "managed user list failed");
                UserManagementServiceError::Internal
            })
    }

    pub async fn create(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        create: CreateManagedUser,
    ) -> Result<ManagedUser, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        validate_create(&create)?;
        let email =
            normalize_email(&create.email).ok_or(UserManagementServiceError::InvalidEmail)?;
        let username = create
            .username
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| default_username(&email));
        let password_hash = self
            .auth_service
            .hash_password(create.password)
            .await
            .map_err(|_| UserManagementServiceError::Internal)?;

        self.repository
            .create(
                requester_id,
                CreateManagedUserRecord {
                    email,
                    password_hash,
                    username,
                    role: create.role,
                    balance_microusd: create.balance_microusd,
                    concurrency_limit: create.concurrency_limit,
                    rpm_limit: create.rpm_limit,
                },
            )
            .await
            .map_err(map_create_error)
    }

    pub async fn update(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        user_id: UserId,
        update: UpdateManagedUser,
    ) -> Result<ManagedUser, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        validate_update(requester_id, user_id, &update)?;
        let email =
            normalize_email(&update.email).ok_or(UserManagementServiceError::InvalidEmail)?;
        let username = update.username.trim().to_owned();
        let notes = update.notes.trim().to_owned();
        let password_hash = match update.password {
            Some(password) => Some(
                self.auth_service
                    .hash_password(password)
                    .await
                    .map_err(|_| UserManagementServiceError::Internal)?,
            ),
            None => None,
        };

        let user = self
            .repository
            .update(
                user_id,
                UpdateManagedUserRecord {
                    email,
                    password_hash,
                    username,
                    notes,
                    role: update.role,
                    status: update.status,
                    concurrency_limit: update.concurrency_limit,
                    rpm_limit: update.rpm_limit,
                },
            )
            .await
            .map_err(|error| map_update_error(error, user_id))?
            .ok_or(UserManagementServiceError::NotFound)?;

        self.auth_service
            .invalidate_user(user_id)
            .await
            .map_err(|_| UserManagementServiceError::Internal)?;

        Ok(user)
    }

    pub async fn delete(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        user_ids: Vec<UserId>,
    ) -> Result<u64, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        let user_ids = validate_delete_user_ids(requester_id, user_ids)?;

        let deleted = match self.repository.delete(&user_ids).await.map_err(|error| {
            tracing::error!(error = %error, ?user_ids, "managed user deletion failed");
            UserManagementServiceError::Internal
        })? {
            ManagedUserDeletionResult::Deleted(deleted) => deleted,
            ManagedUserDeletionResult::NotFound => {
                return Err(UserManagementServiceError::NotFound);
            }
            ManagedUserDeletionResult::Protected | ManagedUserDeletionResult::Referenced => {
                return Err(UserManagementServiceError::DeleteConflict);
            }
        };

        for user_id in user_ids {
            self.auth_service
                .invalidate_user(user_id)
                .await
                .map_err(|_| UserManagementServiceError::Internal)?;
        }

        Ok(deleted)
    }

    pub async fn list_balance_adjustments(
        &self,
        requester_role: AccountRole,
        user_id: UserId,
        pagination: Pagination,
        adjustment_type: Option<ManagedUserBalanceAdjustmentKind>,
    ) -> Result<ManagedUserBalanceAdjustmentPage, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(UserManagementServiceError::InvalidInput);
        }

        self.repository
            .list_balance_adjustments(user_id, pagination, adjustment_type)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    managed_user_id = user_id,
                    "managed user balance adjustment list failed"
                );
                UserManagementServiceError::Internal
            })?
            .ok_or(UserManagementServiceError::NotFound)
    }

    pub async fn adjust_balance(
        &self,
        requester_id: UserId,
        requester_role: AccountRole,
        user_id: UserId,
        amount_microusd: i64,
        notes: String,
        adjustment: ManagedUserBalanceAdjustmentKind,
    ) -> Result<ManagedUser, UserManagementServiceError> {
        require_admin(requester_role, UserManagementServiceError::Forbidden)?;
        let notes = notes.trim().to_owned();
        validate_balance_adjustment(user_id, amount_microusd, &notes)?;

        match self
            .repository
            .adjust_balance(requester_id, user_id, amount_microusd, &notes, adjustment)
            .await
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    managed_user_id = user_id,
                    operator_user_id = requester_id,
                    adjustment_type = adjustment.as_str(),
                    "managed user balance adjustment failed"
                );
                UserManagementServiceError::Internal
            })? {
            ManagedUserBalanceAdjustmentResult::Updated(user) => Ok(*user),
            ManagedUserBalanceAdjustmentResult::NotFound => {
                Err(UserManagementServiceError::NotFound)
            }
            ManagedUserBalanceAdjustmentResult::InvalidBalance => {
                Err(UserManagementServiceError::InvalidBalanceAdjustment)
            }
        }
    }
}

fn validate_balance_adjustment(
    user_id: UserId,
    amount_microusd: i64,
    notes: &str,
) -> Result<(), UserManagementServiceError> {
    if user_id <= 0
        || !(1..=MAX_SAFE_JSON_INTEGER).contains(&amount_microusd)
        || notes.chars().count() > MAX_BALANCE_ADJUSTMENT_NOTES_LENGTH
        || notes.contains('\0')
    {
        return Err(UserManagementServiceError::InvalidBalanceAdjustment);
    }

    Ok(())
}

fn validate_delete_user_ids(
    requester_id: UserId,
    mut user_ids: Vec<UserId>,
) -> Result<Vec<UserId>, UserManagementServiceError> {
    user_ids.sort_unstable();
    user_ids.dedup();

    if user_ids.is_empty()
        || user_ids.len() > MAX_USERS_PER_DELETE
        || user_ids.iter().any(|user_id| *user_id <= 0)
    {
        return Err(UserManagementServiceError::InvalidInput);
    }
    if user_ids.contains(&requester_id) {
        return Err(UserManagementServiceError::DeleteConflict);
    }

    Ok(user_ids)
}

fn validate_create(create: &CreateManagedUser) -> Result<(), UserManagementServiceError> {
    if normalize_email(&create.email).is_none() {
        return Err(UserManagementServiceError::InvalidEmail);
    }
    validate_password(&create.password).map_err(|_| UserManagementServiceError::InvalidPassword)?;
    let username = create.username.as_deref().map(str::trim).unwrap_or("");
    if username.chars().count() > MAX_USERNAME_LENGTH
        || create
            .username
            .as_deref()
            .is_some_and(|value| value.chars().any(char::is_control))
        || !(0..=MAX_SAFE_JSON_INTEGER).contains(&create.balance_microusd)
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&create.concurrency_limit)
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&create.rpm_limit)
    {
        return Err(UserManagementServiceError::InvalidInput);
    }

    Ok(())
}

fn validate_update(
    requester_id: UserId,
    user_id: UserId,
    update: &UpdateManagedUser,
) -> Result<(), UserManagementServiceError> {
    if normalize_email(&update.email).is_none() {
        return Err(UserManagementServiceError::InvalidEmail);
    }
    if user_id <= 0
        || update.username.trim().is_empty()
        || update.username.trim().chars().count() > MAX_USERNAME_LENGTH
        || update.username.chars().any(char::is_control)
        || update.notes.trim().chars().count() > MAX_USER_NOTES_LENGTH
        || update.notes.contains('\0')
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&update.concurrency_limit)
        || !(0..=MAX_USER_REQUEST_LIMIT).contains(&update.rpm_limit)
    {
        return Err(UserManagementServiceError::InvalidInput);
    }
    if let Some(password) = update.password.as_deref() {
        validate_password(password).map_err(|_| UserManagementServiceError::InvalidPassword)?;
    }
    if requester_id == user_id
        && (update.role != AccountRole::Admin || update.status != AccountStatus::Active)
    {
        return Err(UserManagementServiceError::InvalidInput);
    }

    Ok(())
}

fn map_update_error(error: RepositoryError, user_id: UserId) -> UserManagementServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::UserEmail)
    ) {
        return UserManagementServiceError::EmailAlreadyExists;
    }

    tracing::error!(error = %error, managed_user_id = user_id, "managed user update failed");
    UserManagementServiceError::Internal
}

fn map_create_error(error: RepositoryError) -> UserManagementServiceError {
    if matches!(
        error,
        RepositoryError::Conflict(RepositoryConflict::UserEmail)
    ) {
        return UserManagementServiceError::EmailAlreadyExists;
    }

    tracing::error!(error = %error, "managed user creation failed");
    UserManagementServiceError::Internal
}

#[cfg(test)]
#[path = "../../tests/unit/services_user_management.rs"]
mod tests;

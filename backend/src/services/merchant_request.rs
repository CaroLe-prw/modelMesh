use uuid::Uuid;

use crate::{
    domain::{
        AccountRole, MerchantRequest, MerchantRequestSortField, MerchantRequestStatus,
        MerchantRequestType, Page, Pagination, SortDirection, UserId,
    },
    repository::{MerchantRequestRepository, MerchantRequestSearch, NewMerchantRequestRecord},
};

use super::authorization::{require_admin, require_merchant};

const MAX_DESCRIPTION_LENGTH: usize = 2_000;
const MAX_SUBJECT_LENGTH: usize = 120;
const MIN_DESCRIPTION_LENGTH: usize = 10;
const MIN_SUBJECT_LENGTH: usize = 3;
const MAX_SEARCH_QUERY_LENGTH: usize = 256;

#[derive(Clone)]
pub struct MerchantRequestService {
    repository: MerchantRequestRepository,
}

pub struct CreateMerchantRequest {
    pub request_type: MerchantRequestType,
    pub subject: String,
    pub description: String,
}

pub struct AdminMerchantModelLogQuery {
    pub pagination: Pagination,
    pub query: Option<String>,
    pub sort_by: MerchantRequestSortField,
    pub sort_order: SortDirection,
    pub status: Option<MerchantRequestStatus>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantRequestServiceError {
    Forbidden,
    InvalidInput,
    Internal,
}

impl MerchantRequestService {
    pub fn new(repository: MerchantRequestRepository) -> Self {
        Self { repository }
    }

    pub async fn list(
        &self,
        user_id: UserId,
        role: AccountRole,
        pagination: Pagination,
        query: Option<String>,
        status: Option<MerchantRequestStatus>,
        sort_by: MerchantRequestSortField,
        sort_order: SortDirection,
    ) -> Result<Page<MerchantRequest>, MerchantRequestServiceError> {
        require_merchant(role, MerchantRequestServiceError::Forbidden)?;
        let search = build_search(query, status)?;
        self.repository
            .list_by_user(user_id, &search, pagination, sort_by, sort_order)
            .await
            .map_err(|error| {
                tracing::error!(user_id, %error, "merchant request list failed");
                MerchantRequestServiceError::Internal
            })
    }

    pub async fn create(
        &self,
        user_id: UserId,
        role: AccountRole,
        request: CreateMerchantRequest,
    ) -> Result<MerchantRequest, MerchantRequestServiceError> {
        require_merchant(role, MerchantRequestServiceError::Forbidden)?;
        let request = validate_request(request)?;
        let id = Uuid::new_v4();

        self.repository
            .create(NewMerchantRequestRecord {
                id: id.hyphenated().to_string(),
                merchant_user_id: user_id,
                request_type: request.request_type,
                subject: request.subject,
                description: request.description,
            })
            .await
            .map_err(|error| {
                tracing::error!(user_id, %error, "merchant request creation failed");
                MerchantRequestServiceError::Internal
            })
    }

    pub async fn list_latest_channel_operations(
        &self,
        user_id: UserId,
        role: AccountRole,
    ) -> Result<Vec<MerchantRequest>, MerchantRequestServiceError> {
        require_merchant(role, MerchantRequestServiceError::Forbidden)?;
        if user_id <= 0 {
            return Err(MerchantRequestServiceError::InvalidInput);
        }
        self.repository
            .latest_channel_operations(user_id)
            .await
            .map_err(|error| {
                tracing::error!(user_id, %error, "latest merchant channel operation list failed");
                MerchantRequestServiceError::Internal
            })
    }

    pub async fn list_model_logs_for_admin(
        &self,
        requester_role: AccountRole,
        merchant_user_id: UserId,
        request: AdminMerchantModelLogQuery,
    ) -> Result<Page<MerchantRequest>, MerchantRequestServiceError> {
        require_admin(requester_role, MerchantRequestServiceError::Forbidden)?;
        if merchant_user_id <= 0 {
            return Err(MerchantRequestServiceError::InvalidInput);
        }
        let mut search = build_search(request.query, request.status)?;
        search.model_only = true;
        self.repository
            .list_by_user(
                merchant_user_id,
                &search,
                request.pagination,
                request.sort_by,
                request.sort_order,
            )
            .await
            .map_err(|error| {
                tracing::error!(merchant_user_id, %error, "admin merchant model log list failed");
                MerchantRequestServiceError::Internal
            })
    }

    pub async fn latest_channel_operation_for_admin(
        &self,
        requester_role: AccountRole,
        merchant_user_id: UserId,
        channel_id: &str,
    ) -> Result<Option<MerchantRequest>, MerchantRequestServiceError> {
        require_admin(requester_role, MerchantRequestServiceError::Forbidden)?;
        if merchant_user_id <= 0 {
            return Err(MerchantRequestServiceError::InvalidInput);
        }
        let channel_id =
            Uuid::parse_str(channel_id).map_err(|_| MerchantRequestServiceError::InvalidInput)?;
        self.repository
            .latest_channel_operation(merchant_user_id, channel_id)
            .await
            .map_err(|error| {
                tracing::error!(merchant_user_id, %channel_id, %error, "admin latest merchant channel operation lookup failed");
                MerchantRequestServiceError::Internal
            })
    }

    pub async fn latest_model_operation_for_admin(
        &self,
        requester_role: AccountRole,
        merchant_user_id: UserId,
        listing_id: &str,
    ) -> Result<Option<MerchantRequest>, MerchantRequestServiceError> {
        require_admin(requester_role, MerchantRequestServiceError::Forbidden)?;
        if merchant_user_id <= 0 {
            return Err(MerchantRequestServiceError::InvalidInput);
        }
        let listing_id =
            Uuid::parse_str(listing_id).map_err(|_| MerchantRequestServiceError::InvalidInput)?;
        self.repository
            .latest_model_operation(merchant_user_id, listing_id)
            .await
            .map_err(|error| {
                tracing::error!(merchant_user_id, %listing_id, %error, "admin latest merchant model operation lookup failed");
                MerchantRequestServiceError::Internal
            })
    }
}

fn build_search(
    query: Option<String>,
    status: Option<MerchantRequestStatus>,
) -> Result<MerchantRequestSearch, MerchantRequestServiceError> {
    let Some(query) = query else {
        return Ok(MerchantRequestSearch {
            exact_id: None,
            model_only: false,
            pattern: None,
            status,
        });
    };
    let query = query.trim();
    if query.is_empty() {
        return Ok(MerchantRequestSearch {
            exact_id: None,
            model_only: false,
            pattern: None,
            status,
        });
    }
    if query.chars().count() > MAX_SEARCH_QUERY_LENGTH || query.chars().any(char::is_control) {
        return Err(MerchantRequestServiceError::InvalidInput);
    }

    let exact_id = query
        .strip_prefix("log_")
        .unwrap_or(query)
        .parse::<i64>()
        .ok()
        .filter(|id| *id > 0);

    Ok(MerchantRequestSearch {
        exact_id,
        model_only: false,
        pattern: Some(format!("%{}%", escape_like_pattern(query))),
        status,
    })
}

fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

fn validate_request(
    request: CreateMerchantRequest,
) -> Result<CreateMerchantRequest, MerchantRequestServiceError> {
    let subject = request.subject.trim().to_owned();
    let description = request.description.trim().to_owned();
    let subject_length = subject.chars().count();
    let description_length = description.chars().count();

    if !(MIN_SUBJECT_LENGTH..=MAX_SUBJECT_LENGTH).contains(&subject_length)
        || subject.chars().any(char::is_control)
        || !(MIN_DESCRIPTION_LENGTH..=MAX_DESCRIPTION_LENGTH).contains(&description_length)
        || description.chars().any(is_disallowed_multiline_control)
    {
        return Err(MerchantRequestServiceError::InvalidInput);
    }

    Ok(CreateMerchantRequest {
        request_type: request.request_type,
        subject,
        description,
    })
}

fn is_disallowed_multiline_control(character: char) -> bool {
    character.is_control() && !matches!(character, '\n' | '\r' | '\t')
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_request.rs"]
mod tests;

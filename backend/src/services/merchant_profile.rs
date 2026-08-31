use uuid::Uuid;

use crate::{
    domain::{
        AccountRole, MerchantProfileBundle, MerchantSettlementCurrency, MerchantSettlementMethod,
        MerchantSettlementNetwork, UserId,
    },
    repository::{
        MerchantProfileRepository, MerchantSettlementAccountWriteError,
        NewMerchantSettlementAccountRecord, UpdateMerchantProfileRecord,
    },
    security::CredentialCipher,
};

use super::{auth::normalize_email, authorization::require_merchant};

const MAX_BUSINESS_NAME_LENGTH: usize = 120;
const MAX_CONTACT_NAME_LENGTH: usize = 80;
const MAX_INDUSTRY_LENGTH: usize = 80;
const MAX_PHONE_LENGTH: usize = 32;
const MAX_SETTLEMENT_ENTITY_LENGTH: usize = 120;
const MAX_WEBSITE_LENGTH: usize = 255;

#[derive(Clone)]
pub struct MerchantProfileService {
    repository: MerchantProfileRepository,
    credential_cipher: CredentialCipher,
}

pub struct UpdateMerchantProfile {
    pub business_name: String,
    pub website: String,
    pub industry: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
}

pub struct CreateMerchantSettlementAccount {
    pub entity_name: String,
    pub method: MerchantSettlementMethod,
    pub currency: MerchantSettlementCurrency,
    pub network: Option<MerchantSettlementNetwork>,
    pub account: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantProfileServiceError {
    Forbidden,
    InvalidInput,
    SettlementAccountLimit,
    SettlementAccountNotFound,
    SettlementOptionDisabled,
    Internal,
}

impl MerchantProfileService {
    pub fn new(repository: MerchantProfileRepository, credential_cipher: CredentialCipher) -> Self {
        Self {
            repository,
            credential_cipher,
        }
    }

    pub async fn current(
        &self,
        user_id: UserId,
        role: AccountRole,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        require_merchant(role, MerchantProfileServiceError::Forbidden)?;
        self.load_bundle(user_id, "lookup").await
    }

    pub async fn update(
        &self,
        user_id: UserId,
        role: AccountRole,
        request: UpdateMerchantProfile,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        require_merchant(role, MerchantProfileServiceError::Forbidden)?;
        let record = validate_profile(request)?;
        self.repository
            .update_profile(user_id, record)
            .await
            .map_err(|error| {
                tracing::error!(user_id, %error, "merchant profile update failed");
                MerchantProfileServiceError::Internal
            })?
            .ok_or(MerchantProfileServiceError::Internal)?;
        self.load_bundle(user_id, "update").await
    }

    pub async fn create_settlement_account(
        &self,
        user_id: UserId,
        role: AccountRole,
        request: CreateMerchantSettlementAccount,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        require_merchant(role, MerchantProfileServiceError::Forbidden)?;
        let (entity_name, account) = validate_settlement_account(&request)?;
        let id = Uuid::new_v4();
        let id_text = id.hyphenated().to_string();
        let context = settlement_context(&id_text);
        let account_ciphertext = self
            .credential_cipher
            .encrypt(&account, &context)
            .map_err(|_| MerchantProfileServiceError::Internal)?;
        let account_masked = mask_settlement_account(request.method, &account);

        self.repository
            .create_settlement_account(NewMerchantSettlementAccountRecord {
                id: id_text,
                merchant_user_id: user_id,
                entity_name,
                method: request.method,
                currency: request.currency,
                network: request.network,
                account_ciphertext,
                account_masked,
            })
            .await
            .map_err(|error| match error {
                MerchantSettlementAccountWriteError::DisabledOption => {
                    MerchantProfileServiceError::SettlementOptionDisabled
                }
                MerchantSettlementAccountWriteError::LimitReached => {
                    MerchantProfileServiceError::SettlementAccountLimit
                }
                MerchantSettlementAccountWriteError::Repository => {
                    tracing::error!(user_id, "merchant settlement account creation failed");
                    MerchantProfileServiceError::Internal
                }
            })?;
        self.load_bundle(user_id, "settlement_create").await
    }

    pub async fn set_default_settlement_account(
        &self,
        user_id: UserId,
        role: AccountRole,
        account_id: &str,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        require_merchant(role, MerchantProfileServiceError::Forbidden)?;
        validate_uuid(account_id)?;
        self.repository
            .set_default_settlement_account(user_id, account_id)
            .await
            .map_err(|error| {
                tracing::error!(user_id, account_id, %error, "merchant settlement default update failed");
                MerchantProfileServiceError::Internal
            })?
            .ok_or(MerchantProfileServiceError::SettlementAccountNotFound)?;
        self.load_bundle(user_id, "settlement_default").await
    }

    pub async fn delete_settlement_account(
        &self,
        user_id: UserId,
        role: AccountRole,
        account_id: &str,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        require_merchant(role, MerchantProfileServiceError::Forbidden)?;
        validate_uuid(account_id)?;
        let deleted = self
            .repository
            .delete_settlement_account(user_id, account_id)
            .await
            .map_err(|error| {
                tracing::error!(user_id, account_id, %error, "merchant settlement deletion failed");
                MerchantProfileServiceError::Internal
            })?;
        if !deleted {
            return Err(MerchantProfileServiceError::SettlementAccountNotFound);
        }
        self.load_bundle(user_id, "settlement_delete").await
    }

    async fn load_bundle(
        &self,
        user_id: UserId,
        operation: &'static str,
    ) -> Result<MerchantProfileBundle, MerchantProfileServiceError> {
        self.repository.get_bundle(user_id).await.map_err(|error| {
            tracing::error!(user_id, operation, %error, "merchant profile load failed");
            MerchantProfileServiceError::Internal
        })
    }
}

fn validate_profile(
    request: UpdateMerchantProfile,
) -> Result<UpdateMerchantProfileRecord, MerchantProfileServiceError> {
    let business_name = bounded_required(request.business_name, 2, MAX_BUSINESS_NAME_LENGTH)?;
    let industry = bounded_required(request.industry, 2, MAX_INDUSTRY_LENGTH)?;
    let contact_name = bounded_required(request.contact_name, 2, MAX_CONTACT_NAME_LENGTH)?;
    let contact_email =
        normalize_email(&request.contact_email).ok_or(MerchantProfileServiceError::InvalidInput)?;
    let website = validate_optional_website(request.website)?;
    let contact_phone = validate_phone(request.contact_phone)?;

    Ok(UpdateMerchantProfileRecord {
        business_name,
        website,
        industry,
        contact_name,
        contact_email,
        contact_phone,
    })
}

fn validate_settlement_account(
    request: &CreateMerchantSettlementAccount,
) -> Result<(String, String), MerchantProfileServiceError> {
    let entity_name = if request.method == MerchantSettlementMethod::Alipay {
        validate_alipay_recipient_name(request.entity_name.clone())?
    } else {
        bounded_required(request.entity_name.clone(), 2, MAX_SETTLEMENT_ENTITY_LENGTH)?
    };
    let account = match (request.method, request.currency, request.network) {
        (
            MerchantSettlementMethod::Bank,
            MerchantSettlementCurrency::Cny | MerchantSettlementCurrency::Usd,
            None,
        ) => validate_bank_account(&request.account)?,
        (MerchantSettlementMethod::Alipay, MerchantSettlementCurrency::Cny, None) => {
            validate_alipay_phone(&request.account)?
        }
        (MerchantSettlementMethod::Usdt, MerchantSettlementCurrency::Usdt, Some(network)) => {
            validate_usdt_address(&request.account, network)?
        }
        _ => return Err(MerchantProfileServiceError::InvalidInput),
    };
    Ok((entity_name, account))
}

fn validate_alipay_recipient_name(value: String) -> Result<String, MerchantProfileServiceError> {
    let value = bounded_required(value, 2, MAX_CONTACT_NAME_LENGTH)?;
    value
        .chars()
        .all(|character| {
            character.is_alphabetic()
                || character.is_whitespace()
                || matches!(character, '·' | '.' | '-' | '\'')
        })
        .then_some(value)
        .ok_or(MerchantProfileServiceError::InvalidInput)
}

fn validate_bank_account(value: &str) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim();
    if value
        .chars()
        .any(|character| !character.is_ascii_digit() && !matches!(character, ' ' | '-'))
    {
        return Err(MerchantProfileServiceError::InvalidInput);
    }
    let compact = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    (12..=32)
        .contains(&compact.len())
        .then_some(compact)
        .ok_or(MerchantProfileServiceError::InvalidInput)
}

fn validate_alipay_phone(value: &str) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim();
    let has_country_prefix = value.starts_with('+');
    if value.chars().enumerate().any(|(index, character)| {
        !character.is_ascii_digit()
            && !matches!(character, ' ' | '-' | '(' | ')')
            && !(character == '+' && index == 0)
    }) {
        return Err(MerchantProfileServiceError::InvalidInput);
    }
    let digits = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if !(7..=20).contains(&digits.len()) {
        return Err(MerchantProfileServiceError::InvalidInput);
    }
    Ok(if has_country_prefix {
        format!("+{digits}")
    } else {
        digits
    })
}

fn validate_usdt_address(
    value: &str,
    network: MerchantSettlementNetwork,
) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim().to_owned();
    let valid = match network {
        MerchantSettlementNetwork::Trc20 => {
            value.len() == 34
                && value.starts_with('T')
                && value.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() && !matches!(byte, b'0' | b'O' | b'I' | b'l')
                })
        }
        MerchantSettlementNetwork::Erc20
        | MerchantSettlementNetwork::Bep20
        | MerchantSettlementNetwork::Polygon => {
            value.len() == 42
                && value.starts_with("0x")
                && value[2..].bytes().all(|byte| byte.is_ascii_hexdigit())
        }
    };
    valid
        .then_some(value)
        .ok_or(MerchantProfileServiceError::InvalidInput)
}

fn bounded_required(
    value: String,
    minimum: usize,
    maximum: usize,
) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim().to_owned();
    let length = value.chars().count();
    (minimum..=maximum)
        .contains(&length)
        .then_some(value)
        .filter(|value| !value.chars().any(char::is_control))
        .ok_or(MerchantProfileServiceError::InvalidInput)
}

fn validate_optional_website(value: String) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Ok(value);
    }
    if value.chars().count() > MAX_WEBSITE_LENGTH || value.chars().any(char::is_whitespace) {
        return Err(MerchantProfileServiceError::InvalidInput);
    }
    let url = reqwest::Url::parse(&value).map_err(|_| MerchantProfileServiceError::InvalidInput)?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(MerchantProfileServiceError::InvalidInput);
    }
    Ok(value)
}

fn validate_phone(value: String) -> Result<String, MerchantProfileServiceError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Ok(value);
    }
    let valid = value.chars().count() <= MAX_PHONE_LENGTH
        && value.chars().all(|character| {
            character.is_ascii_digit() || matches!(character, '+' | '-' | ' ' | '(' | ')')
        });
    valid
        .then_some(value)
        .ok_or(MerchantProfileServiceError::InvalidInput)
}

fn mask_settlement_account(method: MerchantSettlementMethod, account: &str) -> String {
    let characters = account.chars().collect::<Vec<_>>();
    let suffix = characters.iter().rev().take(4).rev().collect::<String>();
    match method {
        MerchantSettlementMethod::Bank => format!("•••• {suffix}"),
        MerchantSettlementMethod::Alipay => {
            let prefix = characters.iter().take(3).collect::<String>();
            format!("{prefix}••••{suffix}")
        }
        MerchantSettlementMethod::Usdt => {
            let prefix = characters.iter().take(4).collect::<String>();
            format!("{prefix}••••{suffix}")
        }
    }
}

fn settlement_context(account_id: &str) -> String {
    format!("merchant-settlement:{account_id}")
}

fn validate_uuid(value: &str) -> Result<(), MerchantProfileServiceError> {
    Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| MerchantProfileServiceError::InvalidInput)
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_profile.rs"]
mod tests;

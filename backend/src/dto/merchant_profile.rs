use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{
    MerchantProfileBundle, MerchantSettlementAccount, MerchantSettlementCurrency,
    MerchantSettlementMethod, MerchantSettlementNetwork,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMerchantProfileRequest {
    pub business_name: String,
    pub website: String,
    pub industry: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MerchantSettlementMethodValue {
    Bank,
    Alipay,
    Usdt,
}

impl From<MerchantSettlementMethodValue> for MerchantSettlementMethod {
    fn from(value: MerchantSettlementMethodValue) -> Self {
        match value {
            MerchantSettlementMethodValue::Bank => Self::Bank,
            MerchantSettlementMethodValue::Alipay => Self::Alipay,
            MerchantSettlementMethodValue::Usdt => Self::Usdt,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
pub enum MerchantSettlementCurrencyValue {
    #[serde(rename = "CNY")]
    Cny,
    #[serde(rename = "USD")]
    Usd,
    #[serde(rename = "USDT")]
    Usdt,
}

impl From<MerchantSettlementCurrencyValue> for MerchantSettlementCurrency {
    fn from(value: MerchantSettlementCurrencyValue) -> Self {
        match value {
            MerchantSettlementCurrencyValue::Cny => Self::Cny,
            MerchantSettlementCurrencyValue::Usd => Self::Usd,
            MerchantSettlementCurrencyValue::Usdt => Self::Usdt,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
pub enum MerchantSettlementNetworkValue {
    #[serde(rename = "TRC20")]
    Trc20,
    #[serde(rename = "ERC20")]
    Erc20,
    #[serde(rename = "BEP20")]
    Bep20,
    #[serde(rename = "POLYGON")]
    Polygon,
}

impl From<MerchantSettlementNetworkValue> for MerchantSettlementNetwork {
    fn from(value: MerchantSettlementNetworkValue) -> Self {
        match value {
            MerchantSettlementNetworkValue::Trc20 => Self::Trc20,
            MerchantSettlementNetworkValue::Erc20 => Self::Erc20,
            MerchantSettlementNetworkValue::Bep20 => Self::Bep20,
            MerchantSettlementNetworkValue::Polygon => Self::Polygon,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMerchantSettlementAccountRequest {
    pub entity_name: String,
    pub method: MerchantSettlementMethodValue,
    pub currency: MerchantSettlementCurrencyValue,
    pub network: Option<MerchantSettlementNetworkValue>,
    pub account: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantSettlementAccountResponse {
    pub id: String,
    pub entity_name: String,
    pub method: &'static str,
    pub currency: &'static str,
    pub network: Option<&'static str>,
    pub account_masked: String,
    pub is_default: bool,
    pub created_at: Timestamp,
}

impl From<MerchantSettlementAccount> for MerchantSettlementAccountResponse {
    fn from(account: MerchantSettlementAccount) -> Self {
        Self {
            id: account.id,
            entity_name: account.entity_name,
            method: account.method.as_str(),
            currency: account.currency.as_str(),
            network: account.network.map(MerchantSettlementNetwork::as_str),
            account_masked: account.account_masked,
            is_default: account.is_default,
            created_at: account.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerchantProfileResponse {
    pub merchant_code: String,
    pub business_name: String,
    pub website: String,
    pub industry: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
    pub updated_at: Timestamp,
    pub settlement_accounts: Vec<MerchantSettlementAccountResponse>,
}

impl From<MerchantProfileBundle> for MerchantProfileResponse {
    fn from(bundle: MerchantProfileBundle) -> Self {
        Self {
            merchant_code: bundle.profile.merchant_code,
            business_name: bundle.profile.business_name,
            website: bundle.profile.website,
            industry: bundle.profile.industry,
            contact_name: bundle.profile.contact_name,
            contact_email: bundle.profile.contact_email,
            contact_phone: bundle.profile.contact_phone,
            updated_at: bundle.profile.updated_at,
            settlement_accounts: bundle
                .settlement_accounts
                .into_iter()
                .map(MerchantSettlementAccountResponse::from)
                .collect(),
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/dto_merchant_profile.rs"]
mod tests;

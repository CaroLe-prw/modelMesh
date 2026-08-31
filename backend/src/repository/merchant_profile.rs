use jiff::Timestamp;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set, TransactionTrait, sea_query::Expr,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    domain::{
        MerchantProfile, MerchantProfileBundle, MerchantSettlementAccount,
        MerchantSettlementCurrency, MerchantSettlementMethod, MerchantSettlementNetwork, UserId,
    },
    entity::{
        merchant_application, merchant_profile, merchant_settlement_account, system_setting, user,
    },
};

use super::RepositoryError;

const MAX_SETTLEMENT_ACCOUNTS: u64 = 10;

#[derive(Clone)]
pub struct MerchantProfileRepository {
    database: DatabaseConnection,
}

pub struct UpdateMerchantProfileRecord {
    pub business_name: String,
    pub website: String,
    pub industry: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
}

pub struct NewMerchantSettlementAccountRecord {
    pub id: String,
    pub merchant_user_id: UserId,
    pub entity_name: String,
    pub method: MerchantSettlementMethod,
    pub currency: MerchantSettlementCurrency,
    pub network: Option<MerchantSettlementNetwork>,
    pub account_ciphertext: String,
    pub account_masked: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantSettlementAccountWriteError {
    DisabledOption,
    LimitReached,
    Repository,
}

impl MerchantProfileRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn get_bundle(
        &self,
        user_id: UserId,
    ) -> Result<MerchantProfileBundle, RepositoryError> {
        let profile = self.ensure_profile(user_id).await?;
        let settlement_accounts = self.list_settlement_accounts(user_id).await?;
        Ok(MerchantProfileBundle {
            profile,
            settlement_accounts,
        })
    }

    pub async fn update_profile(
        &self,
        user_id: UserId,
        record: UpdateMerchantProfileRecord,
    ) -> Result<Option<MerchantProfile>, RepositoryError> {
        self.ensure_profile(user_id).await?;
        let updated = merchant_profile::Entity::update_many()
            .set(merchant_profile::ActiveModel {
                business_name: Set(record.business_name),
                website: Set(record.website),
                industry: Set(record.industry),
                contact_name: Set(record.contact_name),
                contact_email: Set(record.contact_email),
                contact_phone: Set(record.contact_phone),
                ..Default::default()
            })
            .col_expr(
                merchant_profile::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_profile::Column::MerchantUserId.eq(user_id))
            .exec_with_returning(&self.database)
            .await?
            .into_iter()
            .next();

        updated.map(merchant_profile_from_model).transpose()
    }

    pub async fn create_settlement_account(
        &self,
        record: NewMerchantSettlementAccountRecord,
    ) -> Result<MerchantSettlementAccount, MerchantSettlementAccountWriteError> {
        self.ensure_profile(record.merchant_user_id)
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?;
        let transaction = self
            .database
            .begin()
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?;
        merchant_profile::Entity::find_by_id(record.merchant_user_id)
            .lock_exclusive()
            .one(&transaction)
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?
            .ok_or(MerchantSettlementAccountWriteError::Repository)?;
        let settings = system_setting::Entity::find_by_id(1_i16)
            .lock_shared()
            .one(&transaction)
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?
            .ok_or(MerchantSettlementAccountWriteError::Repository)?;
        let method_enabled = match record.method {
            MerchantSettlementMethod::Bank => settings.bank_enabled,
            MerchantSettlementMethod::Alipay => settings.alipay_enabled,
            MerchantSettlementMethod::Usdt => settings.usdt_enabled,
        };
        if !method_enabled {
            return Err(MerchantSettlementAccountWriteError::DisabledOption);
        }
        if let Some(network) = record.network {
            let network_enabled = match network {
                MerchantSettlementNetwork::Trc20 => settings.trc20_enabled,
                MerchantSettlementNetwork::Erc20 => settings.erc20_enabled,
                MerchantSettlementNetwork::Bep20 => settings.bep20_enabled,
                MerchantSettlementNetwork::Polygon => settings.polygon_enabled,
            };
            if !network_enabled {
                return Err(MerchantSettlementAccountWriteError::DisabledOption);
            }
        }
        let count = merchant_settlement_account::Entity::find()
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(record.merchant_user_id))
            .count(&transaction)
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?;
        if count >= MAX_SETTLEMENT_ACCOUNTS {
            return Err(MerchantSettlementAccountWriteError::LimitReached);
        }

        let account = merchant_settlement_account::ActiveModel {
            id: Set(Uuid::parse_str(&record.id)
                .map_err(|_| MerchantSettlementAccountWriteError::Repository)?),
            merchant_user_id: Set(record.merchant_user_id),
            entity_name: Set(record.entity_name),
            method: Set(record.method.as_str().to_owned()),
            currency: Set(record.currency.as_str().to_owned()),
            network: Set(record.network.map(|network| network.as_str().to_owned())),
            account_ciphertext: Set(record.account_ciphertext),
            account_masked: Set(record.account_masked),
            is_default: Set(count == 0),
            ..Default::default()
        }
        .insert(&transaction)
        .await
        .map_err(|_| MerchantSettlementAccountWriteError::Repository)?;
        transaction
            .commit()
            .await
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)?;

        merchant_settlement_account_from_model(account)
            .map_err(|_| MerchantSettlementAccountWriteError::Repository)
    }

    pub async fn set_default_settlement_account(
        &self,
        user_id: UserId,
        account_id: &str,
    ) -> Result<Option<MerchantSettlementAccount>, RepositoryError> {
        let account_id = Uuid::parse_str(account_id).map_err(invalid_data)?;
        let transaction = self.database.begin().await?;
        let target = merchant_settlement_account::Entity::find_by_id(account_id)
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(user_id))
            .lock_exclusive()
            .one(&transaction)
            .await?;
        let Some(target) = target else {
            return Ok(None);
        };

        merchant_settlement_account::Entity::update_many()
            .set(merchant_settlement_account::ActiveModel {
                is_default: Set(false),
                ..Default::default()
            })
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(user_id))
            .exec(&transaction)
            .await?;
        merchant_settlement_account::Entity::update_many()
            .set(merchant_settlement_account::ActiveModel {
                is_default: Set(true),
                ..Default::default()
            })
            .col_expr(
                merchant_settlement_account::Column::UpdatedAt,
                Expr::current_timestamp(),
            )
            .filter(merchant_settlement_account::Column::Id.eq(account_id))
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(user_id))
            .exec(&transaction)
            .await?;
        transaction.commit().await?;

        merchant_settlement_account_from_model(merchant_settlement_account::Model {
            is_default: true,
            ..target
        })
        .map(Some)
    }

    pub async fn delete_settlement_account(
        &self,
        user_id: UserId,
        account_id: &str,
    ) -> Result<bool, RepositoryError> {
        let account_id = Uuid::parse_str(account_id).map_err(invalid_data)?;
        let transaction = self.database.begin().await?;
        let accounts = merchant_settlement_account::Entity::find()
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(user_id))
            .order_by_asc(merchant_settlement_account::Column::CreatedAt)
            .order_by_asc(merchant_settlement_account::Column::Id)
            .lock_exclusive()
            .all(&transaction)
            .await?;
        let Some(target) = accounts.iter().find(|account| account.id == account_id) else {
            return Ok(false);
        };

        merchant_settlement_account::Entity::delete_by_id(account_id)
            .exec(&transaction)
            .await?;
        if target.is_default
            && let Some(next_default) = accounts.iter().find(|account| account.id != account_id)
        {
            merchant_settlement_account::Entity::update_many()
                .set(merchant_settlement_account::ActiveModel {
                    is_default: Set(true),
                    ..Default::default()
                })
                .col_expr(
                    merchant_settlement_account::Column::UpdatedAt,
                    Expr::current_timestamp(),
                )
                .filter(merchant_settlement_account::Column::Id.eq(next_default.id))
                .exec(&transaction)
                .await?;
        }
        transaction.commit().await?;
        Ok(true)
    }

    async fn ensure_profile(&self, user_id: UserId) -> Result<MerchantProfile, RepositoryError> {
        if let Some(profile) = merchant_profile::Entity::find_by_id(user_id)
            .one(&self.database)
            .await?
        {
            return merchant_profile_from_model(profile);
        }

        let user = user::Entity::find_by_id(user_id)
            .one(&self.database)
            .await?
            .ok_or_else(|| {
                RepositoryError::InvalidData("merchant user was not found".to_owned())
            })?;
        let application = merchant_application::Entity::find()
            .filter(merchant_application::Column::UserId.eq(user_id))
            .one(&self.database)
            .await?;
        let business_name = application
            .as_ref()
            .map(|application| application.business_name.clone())
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| user.username.clone());
        let website = application
            .and_then(|application| application.website)
            .unwrap_or_default();
        let merchant_code = format!("MM-{}-{user_id:06}", user.created_at.year());
        let profile = merchant_profile::ActiveModel {
            merchant_user_id: Set(user_id),
            merchant_code: Set(merchant_code),
            business_name: Set(business_name),
            website: Set(website),
            industry: Set("AI services".to_owned()),
            contact_name: Set(user.username),
            contact_email: Set(user.email),
            contact_phone: Set(String::new()),
            ..Default::default()
        }
        .insert(&self.database)
        .await;

        match profile {
            Ok(profile) => merchant_profile_from_model(profile),
            Err(_) => merchant_profile::Entity::find_by_id(user_id)
                .one(&self.database)
                .await?
                .ok_or_else(|| {
                    RepositoryError::InvalidData("merchant profile was not found".to_owned())
                })
                .and_then(merchant_profile_from_model),
        }
    }

    async fn list_settlement_accounts(
        &self,
        user_id: UserId,
    ) -> Result<Vec<MerchantSettlementAccount>, RepositoryError> {
        merchant_settlement_account::Entity::find()
            .filter(merchant_settlement_account::Column::MerchantUserId.eq(user_id))
            .order_by_desc(merchant_settlement_account::Column::IsDefault)
            .order_by_asc(merchant_settlement_account::Column::CreatedAt)
            .order_by_asc(merchant_settlement_account::Column::Id)
            .all(&self.database)
            .await?
            .into_iter()
            .map(merchant_settlement_account_from_model)
            .collect()
    }
}

fn merchant_profile_from_model(
    model: merchant_profile::Model,
) -> Result<MerchantProfile, RepositoryError> {
    Ok(MerchantProfile {
        merchant_code: model.merchant_code,
        business_name: model.business_name,
        website: model.website,
        industry: model.industry,
        contact_name: model.contact_name,
        contact_email: model.contact_email,
        contact_phone: model.contact_phone,
        updated_at: domain_timestamp(model.updated_at)?,
    })
}

fn merchant_settlement_account_from_model(
    model: merchant_settlement_account::Model,
) -> Result<MerchantSettlementAccount, RepositoryError> {
    let network = model
        .network
        .as_deref()
        .map(|value| {
            MerchantSettlementNetwork::from_database(value).ok_or_else(|| {
                RepositoryError::InvalidData(format!("unknown settlement network `{value}`"))
            })
        })
        .transpose()?;

    Ok(MerchantSettlementAccount {
        id: model.id.hyphenated().to_string(),
        entity_name: model.entity_name,
        method: MerchantSettlementMethod::from_database(&model.method).ok_or_else(|| {
            RepositoryError::InvalidData(format!("unknown settlement method `{}`", model.method))
        })?,
        currency: MerchantSettlementCurrency::from_database(&model.currency).ok_or_else(|| {
            RepositoryError::InvalidData(format!(
                "unknown settlement currency `{}`",
                model.currency
            ))
        })?,
        network,
        account_masked: model.account_masked,
        is_default: model.is_default,
        created_at: domain_timestamp(model.created_at)?,
    })
}

fn domain_timestamp(value: OffsetDateTime) -> Result<Timestamp, RepositoryError> {
    Timestamp::new(value.unix_timestamp(), value.nanosecond() as i32)
        .map_err(|error| RepositoryError::InvalidData(error.to_string()))
}

fn invalid_data(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::InvalidData(error.to_string())
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_profile.rs"]
mod tests;

use jiff::Timestamp;

use super::{MerchantSettlementMethod, MerchantSettlementNetwork};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantSettlementSettings {
    pub enabled_methods: Vec<MerchantSettlementMethod>,
    pub enabled_networks: Vec<MerchantSettlementNetwork>,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SystemFinanceSettings {
    pub withdrawal_minimum_microusd: i64,
    pub withdrawal_fee_bps: i32,
    pub platform_fee_bps: i32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SystemSettings {
    pub registration_enabled: bool,
    pub finance: SystemFinanceSettings,
    pub settlement: MerchantSettlementSettings,
    pub updated_at: Timestamp,
}

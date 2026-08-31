use jiff::Timestamp;

use super::{MerchantSettlementMethod, MerchantSettlementNetwork};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantSettlementSettings {
    pub enabled_methods: Vec<MerchantSettlementMethod>,
    pub enabled_networks: Vec<MerchantSettlementNetwork>,
    pub updated_at: Timestamp,
}

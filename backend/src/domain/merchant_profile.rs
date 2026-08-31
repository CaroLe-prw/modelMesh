use jiff::Timestamp;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum MerchantSettlementMethod {
    Bank,
    Alipay,
    Usdt,
}

impl MerchantSettlementMethod {
    pub const CONFIGURABLE: [Self; 3] = [Self::Bank, Self::Alipay, Self::Usdt];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Bank => "bank",
            Self::Alipay => "alipay",
            Self::Usdt => "usdt",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "bank" => Some(Self::Bank),
            "alipay" => Some(Self::Alipay),
            "usdt" => Some(Self::Usdt),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MerchantSettlementCurrency {
    Cny,
    Usd,
    Usdt,
}

impl MerchantSettlementCurrency {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Cny => "CNY",
            Self::Usd => "USD",
            Self::Usdt => "USDT",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "CNY" => Some(Self::Cny),
            "USD" => Some(Self::Usd),
            "USDT" => Some(Self::Usdt),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum MerchantSettlementNetwork {
    Trc20,
    Erc20,
    Bep20,
    Polygon,
}

impl MerchantSettlementNetwork {
    pub const ALL: [Self; 4] = [Self::Trc20, Self::Erc20, Self::Bep20, Self::Polygon];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Trc20 => "TRC20",
            Self::Erc20 => "ERC20",
            Self::Bep20 => "BEP20",
            Self::Polygon => "POLYGON",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "TRC20" => Some(Self::Trc20),
            "ERC20" => Some(Self::Erc20),
            "BEP20" => Some(Self::Bep20),
            "POLYGON" => Some(Self::Polygon),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantProfile {
    pub merchant_code: String,
    pub business_name: String,
    pub website: String,
    pub industry: String,
    pub contact_name: String,
    pub contact_email: String,
    pub contact_phone: String,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantSettlementAccount {
    pub id: String,
    pub entity_name: String,
    pub method: MerchantSettlementMethod,
    pub currency: MerchantSettlementCurrency,
    pub network: Option<MerchantSettlementNetwork>,
    pub account_masked: String,
    pub is_default: bool,
    pub created_at: Timestamp,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantProfileBundle {
    pub profile: MerchantProfile,
    pub settlement_accounts: Vec<MerchantSettlementAccount>,
}

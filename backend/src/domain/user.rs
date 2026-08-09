pub type UserId = i64;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AccountRole {
    Personal,
    Merchant,
    Admin,
}

impl AccountRole {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Personal => "personal",
            Self::Merchant => "merchant",
            Self::Admin => "admin",
        }
    }

    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "personal" => Some(Self::Personal),
            "merchant" => Some(Self::Merchant),
            "admin" => Some(Self::Admin),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: String,
    pub role: AccountRole,
}

#[cfg(test)]
#[path = "../../tests/unit/user.rs"]
mod tests;

use super::AccountRole;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AppRouteGroup {
    Personal,
    Merchant,
    Admin,
}

impl AppRouteGroup {
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

#[derive(Clone, Debug)]
pub struct AppRoute {
    pub route_key: String,
    pub path: String,
    pub label_key: String,
    pub icon_key: String,
    pub group: AppRouteGroup,
    pub sort_order: i32,
    pub enabled: bool,
    pub roles: Vec<AccountRole>,
}

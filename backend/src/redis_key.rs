use crate::domain::UserId;

const ACCESS_TOKEN_PREFIX: &str = "modelmesh:auth:access-token:";
const ACCOUNT_ROUTES_PREFIX: &str = "modelmesh:account-routes:user:";

pub mod ttl {
    const ONE_DAY_SECONDS: u64 = 24 * 60 * 60;

    pub const ACCESS_TOKEN_SECONDS: u64 = ONE_DAY_SECONDS;
    pub const ACCOUNT_ROUTES_SECONDS: u64 = ONE_DAY_SECONDS;
}

pub fn access_token(token_hash: &str) -> String {
    format!("{ACCESS_TOKEN_PREFIX}{token_hash}")
}

pub fn account_routes(user_id: UserId) -> String {
    format!("{ACCOUNT_ROUTES_PREFIX}{user_id}")
}

#[cfg(test)]
#[path = "../tests/unit/redis_key.rs"]
mod tests;

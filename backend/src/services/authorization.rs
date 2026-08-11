use crate::domain::AccountRole;

pub(super) fn require_admin<Error>(role: AccountRole, forbidden_error: Error) -> Result<(), Error> {
    if role == AccountRole::Admin {
        Ok(())
    } else {
        Err(forbidden_error)
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_authorization.rs"]
mod tests;

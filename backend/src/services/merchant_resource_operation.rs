use crate::domain::{MerchantOperationAudit, MerchantOperationSource, UserId};

const MAX_OPERATION_REASON_LENGTH: usize = 500;

pub(super) fn admin_operation_audit(
    operator_user_id: UserId,
    taking_offline: bool,
    reason: String,
) -> Result<MerchantOperationAudit, ()> {
    let reason = reason.trim().to_owned();
    if operator_user_id <= 0
        || (taking_offline && reason.is_empty())
        || reason.chars().count() > MAX_OPERATION_REASON_LENGTH
        || reason
            .chars()
            .any(|character| character.is_control() && !matches!(character, '\n' | '\r' | '\t'))
    {
        return Err(());
    }
    Ok(MerchantOperationAudit {
        operator_user_id,
        source: MerchantOperationSource::Admin,
        reason,
    })
}

#[cfg(test)]
#[path = "../../tests/unit/services_merchant_resource_operation.rs"]
mod tests;

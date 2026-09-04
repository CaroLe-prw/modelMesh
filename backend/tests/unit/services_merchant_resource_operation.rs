use crate::domain::MerchantOperationSource;

use super::admin_operation_audit;

#[test]
fn administrator_offline_operation_requires_a_reason() {
    assert_eq!(admin_operation_audit(1, true, "   ".to_owned()), Err(()));
}

#[test]
fn administrator_operation_reason_is_trimmed_and_bounded() {
    assert_eq!(
        admin_operation_audit(1, true, "  repeated failures  ".to_owned())
            .map(|audit| audit.reason),
        Ok("repeated failures".to_owned())
    );
    assert_eq!(
        admin_operation_audit(1, false, String::new()).map(|audit| audit.reason),
        Ok(String::new())
    );
    assert_eq!(admin_operation_audit(1, true, "x".repeat(501)), Err(()));
    assert_eq!(
        admin_operation_audit(1, true, "invalid\0reason".to_owned()),
        Err(())
    );
}

#[test]
fn administrator_offline_and_restore_operations_keep_the_actor_context() {
    let offline = admin_operation_audit(9, true, " incident response ".to_owned())
        .expect("offline operation should be accepted");
    let restore = admin_operation_audit(9, false, String::new())
        .expect("restore operation should be accepted");

    assert_eq!(offline.operator_user_id, 9);
    assert_eq!(offline.source, MerchantOperationSource::Admin);
    assert_eq!(offline.reason, "incident response");
    assert_eq!(restore.operator_user_id, 9);
    assert_eq!(restore.source, MerchantOperationSource::Admin);
    assert!(restore.reason.is_empty());
}

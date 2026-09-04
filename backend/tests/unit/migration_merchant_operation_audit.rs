use super::UP_SQL;

#[test]
fn operation_audit_migration_captures_transaction_local_actor_context() {
    for fragment in [
        "ADD COLUMN operator_user_id BIGINT",
        "ADD COLUMN operator_source VARCHAR(16)",
        "ADD COLUMN operation_reason TEXT",
        "current_setting('modelmesh.operator_user_id', TRUE)",
        "current_setting('modelmesh.operator_source', TRUE)",
        "current_setting('modelmesh.operation_reason', TRUE)",
        "BEFORE INSERT ON merchant_business_logs",
    ] {
        assert!(UP_SQL.contains(fragment), "missing {fragment}");
    }
}

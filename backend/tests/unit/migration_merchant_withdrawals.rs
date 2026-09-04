use super::UP_SQL;

#[test]
fn withdrawal_migration_keeps_money_and_destination_auditable() {
    assert!(UP_SQL.contains("CREATE TABLE merchant_withdrawals"));
    assert!(UP_SQL.contains("balance_after_microusd BIGINT NOT NULL"));
    assert!(UP_SQL.contains("ON DELETE SET NULL"));
    assert!(UP_SQL.contains("account_masked"));
    assert!(UP_SQL.contains("account_ciphertext TEXT NOT NULL"));
    assert!(UP_SQL.contains("account_encryption_context VARCHAR(80) NOT NULL"));
    assert!(UP_SQL.contains("COMMENT ON TABLE merchant_withdrawals"));
    assert!(UP_SQL.contains("COMMENT ON COLUMN merchant_withdrawals.updated_at"));
}

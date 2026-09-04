use sea_orm::DatabaseBackend;

use crate::domain::{MerchantOperationAudit, MerchantOperationSource};

use super::merchant_operation_context_statement;

#[test]
fn operation_context_is_transaction_local_and_parameterized() {
    let statement = merchant_operation_context_statement(
        DatabaseBackend::Postgres,
        &MerchantOperationAudit {
            operator_user_id: 1,
            source: MerchantOperationSource::Admin,
            reason: "Repeated upstream failures".to_owned(),
        },
    );

    assert!(
        statement
            .sql
            .contains("set_config('modelmesh.operator_user_id', $1::text, TRUE)")
    );
    assert!(
        statement
            .sql
            .contains("set_config('modelmesh.operator_source', $2, TRUE)")
    );
    assert!(
        statement
            .sql
            .contains("set_config('modelmesh.operation_reason', $3, TRUE)")
    );
    assert!(!statement.sql.contains("Repeated upstream failures"));
}

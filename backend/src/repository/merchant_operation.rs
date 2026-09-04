use sea_orm::{ConnectionTrait, DatabaseBackend, DbErr, Statement};

use crate::domain::MerchantOperationAudit;

pub async fn set_merchant_operation_context<Connection>(
    connection: &Connection,
    audit: &MerchantOperationAudit,
) -> Result<(), DbErr>
where
    Connection: ConnectionTrait,
{
    connection
        .execute_raw(merchant_operation_context_statement(
            connection.get_database_backend(),
            audit,
        ))
        .await?;
    Ok(())
}

fn merchant_operation_context_statement(
    database_backend: DatabaseBackend,
    audit: &MerchantOperationAudit,
) -> Statement {
    Statement::from_sql_and_values(
        database_backend,
        "SELECT set_config('modelmesh.operator_user_id', $1::text, TRUE), \
                set_config('modelmesh.operator_source', $2, TRUE), \
                set_config('modelmesh.operation_reason', $3, TRUE)",
        vec![
            audit.operator_user_id.into(),
            audit.source.as_database_str().to_owned().into(),
            audit.reason.clone().into(),
        ],
    )
}

#[cfg(test)]
#[path = "../../tests/unit/repository_merchant_operation.rs"]
mod tests;

use sea_orm::{DatabaseBackend, QueryTrait};

use crate::domain::ManagedMerchantStatus;

use super::{MerchantSearch, merchant_list_query};

#[test]
fn merchant_list_combines_accounts_and_reviewed_applications() {
    let query = merchant_list_query(&MerchantSearch {
        exact_user_id: Some(47),
        pattern: Some("%northstar%".to_owned()),
        status: None,
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains("LEFT JOIN"));
    assert!(query.contains(r#""merchant_applications""#));
    assert!(query.contains(r#""merchant_applications"."business_name" ILIKE"#));
    assert!(query.contains("COALESCE(NULLIF(merchant_applications.business_name"));
    assert!(query.contains("WHEN users.role = 'merchant'"));
    assert!(query.contains("WHEN merchant_applications.status = 'rejected' THEN 'rejected'"));
    assert!(query.contains("ELSE 'pending' END"));
    assert!(query.contains(r#""merchant_applications"."status" = 'rejected'"#));
    assert!(query.contains(r#"COUNT(*) OVER() AS "total_count""#));
    assert!(query.contains(r#""users"."concurrency_limit""#));
    assert!(query.contains(r#""users"."rpm_limit""#));
    assert!(query.contains(r#"ORDER BY "users"."created_at" DESC"#));
}

#[test]
fn merchant_status_filter_uses_merchant_and_application_states() {
    let pending = merchant_list_query(&MerchantSearch {
        exact_user_id: None,
        pattern: None,
        status: Some(ManagedMerchantStatus::Pending),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();
    let suspended = merchant_list_query(&MerchantSearch {
        exact_user_id: None,
        pattern: None,
        status: Some(ManagedMerchantStatus::Suspended),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();
    let rejected = merchant_list_query(&MerchantSearch {
        exact_user_id: None,
        pattern: None,
        status: Some(ManagedMerchantStatus::Rejected),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(pending.contains(r#""users"."role" = 'personal'"#));
    assert!(pending.contains(r#""merchant_applications"."status" = 'pending'"#));
    assert!(rejected.contains(r#""users"."role" = 'personal'"#));
    assert!(rejected.contains(r#""merchant_applications"."status" = 'rejected'"#));
    assert!(suspended.contains(r#""users"."role" = 'merchant'"#));
    assert!(suspended.contains(r#""users"."merchant_status" = 'disabled'"#));
    assert!(!suspended.contains(r#""users"."status" = 'disabled'"#));
}

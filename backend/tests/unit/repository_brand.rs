use sea_orm::{DatabaseBackend, QueryTrait};

use crate::domain::{BrandStatus, Pagination};

use super::{BrandSearch, brand_list_query, brand_page_query};

#[test]
fn list_query_filters_name_identifier_status_and_uses_stable_sorting() {
    let query = brand_list_query(&BrandSearch {
        pattern: Some("%open\\_%".to_owned()),
        status: Some(BrandStatus::Active),
    })
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains("ILIKE"));
    assert!(query.contains(r#""brands"."name""#));
    assert!(query.contains(r#""brands"."identifier""#));
    assert!(query.contains(r#""brands"."status""#));
    assert!(query.contains(r#"ORDER BY "brands"."sort_order" ASC"#));
    assert!(query.contains(r#""brands"."id" ASC"#));
}

#[test]
fn paginated_brand_query_applies_the_requested_limit_and_offset() {
    let pagination = Pagination::new(3, 10).expect("pagination should be valid");
    let query = brand_page_query(
        &BrandSearch {
            pattern: None,
            status: None,
        },
        pagination,
    )
    .build(DatabaseBackend::Postgres)
    .to_string();

    assert!(query.contains("LIMIT 10"), "{query}");
    assert!(query.contains("OFFSET 20"), "{query}");
}

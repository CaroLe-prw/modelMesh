use sea_orm::{DbBackend, QueryTrait};

use super::merchant_channel_list_query;

#[test]
fn channel_list_is_scoped_to_the_owner_and_stably_sorted() {
    let sql = merchant_channel_list_query(42)
        .build(DbBackend::Postgres)
        .to_string();

    assert!(
        sql.contains(r#""merchant_channels"."merchant_user_id" = 42"#),
        "{sql}"
    );
    assert!(
        sql.contains(
            r#"ORDER BY "merchant_channels"."updated_at" DESC, "merchant_channels"."id" DESC"#
        ),
        "{sql}"
    );
}

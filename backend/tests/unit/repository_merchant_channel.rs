use sea_orm::{DbBackend, QueryTrait};
use uuid::Uuid;

use crate::domain::MerchantChannelStatus;

use super::{merchant_channel_list_query, merchant_channel_status_update};

#[test]
fn channel_status_update_requires_both_owner_and_channel_id() {
    let channel_id = Uuid::parse_str("00000000-0000-4000-8000-000000000001")
        .expect("channel id should be valid");
    let sql = merchant_channel_status_update(47, channel_id, MerchantChannelStatus::Offline)
        .build(DbBackend::Postgres)
        .to_string();

    assert!(sql.contains(r#""merchant_user_id" = 47"#), "{sql}");
    assert!(
        sql.contains(r#""id" = '00000000-0000-4000-8000-000000000001'"#),
        "{sql}"
    );
}

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

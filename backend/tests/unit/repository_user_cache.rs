use super::{deserialize_user, serialize_user};
use crate::domain::{AccountRole, User};

#[test]
fn cached_user_round_trips() {
    let user = User {
        email: "merchant@example.com".to_owned(),
        id: 42,
        role: AccountRole::Merchant,
    };
    let value = serialize_user(&user).expect("user cache should serialize");
    let restored = deserialize_user(&value, 42).expect("user cache should deserialize");

    assert_eq!(restored.id, user.id);
    assert_eq!(restored.email, user.email);
    assert_eq!(restored.role, user.role);
}

#[test]
fn cached_user_rejects_another_user_id_or_unknown_role() {
    let value = r#"{"email":"user@example.com","id":42,"role":"merchant"}"#;
    let invalid_role = r#"{"email":"user@example.com","id":42,"role":"owner"}"#;

    assert!(deserialize_user(value, 7).is_none());
    assert!(deserialize_user(invalid_role, 42).is_none());
}

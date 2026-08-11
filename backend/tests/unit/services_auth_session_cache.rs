use std::{thread, time::Duration};

use super::AuthSessionCache;
use crate::domain::{AccountRole, User};

fn user(id: i64) -> User {
    User {
        email: format!("user-{id}@example.com"),
        id,
        role: AccountRole::Admin,
    }
}

#[test]
fn cached_session_can_be_read_and_removed() {
    let cache = AuthSessionCache::new(Duration::from_secs(30), 8);
    cache.insert("token".to_owned(), user(42));

    assert_eq!(cache.get("token").map(|user| user.id), Some(42));

    cache.remove("token");

    assert!(cache.get("token").is_none());
}

#[test]
fn expired_session_is_not_returned() {
    let cache = AuthSessionCache::new(Duration::from_millis(1), 8);
    cache.insert("token".to_owned(), user(42));
    thread::sleep(Duration::from_millis(5));

    assert!(cache.get("token").is_none());
}

#[test]
fn cache_stays_within_its_entry_limit() {
    let cache = AuthSessionCache::new(Duration::from_secs(30), 1);
    cache.insert("first".to_owned(), user(1));
    cache.insert("second".to_owned(), user(2));

    assert!(cache.get("first").is_none());
    assert_eq!(cache.get("second").map(|user| user.id), Some(2));
}

#[test]
fn revoked_session_cannot_be_reinserted_during_logout() {
    let cache = AuthSessionCache::new(Duration::from_secs(30), 8);
    cache.insert("token".to_owned(), user(42));
    cache.revoke("token".to_owned());
    cache.insert("token".to_owned(), user(42));

    assert!(cache.get("token").is_none());
}

use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
    time::{Duration, Instant},
};

use crate::domain::User;

const DEFAULT_TTL: Duration = Duration::from_secs(30);
const DEFAULT_MAX_ENTRIES: usize = 1_024;

#[derive(Clone)]
pub(super) struct AuthSessionCache {
    max_entries: usize,
    state: Arc<RwLock<CacheState>>,
    ttl: Duration,
}

#[derive(Default)]
struct CacheState {
    entries: HashMap<String, CacheEntry>,
    revoked: HashMap<String, Instant>,
}

#[derive(Clone)]
struct CacheEntry {
    expires_at: Instant,
    user: User,
}

impl AuthSessionCache {
    pub(super) fn with_defaults() -> Self {
        Self::new(DEFAULT_TTL, DEFAULT_MAX_ENTRIES)
    }

    fn new(ttl: Duration, max_entries: usize) -> Self {
        Self {
            max_entries,
            state: Arc::new(RwLock::new(CacheState::default())),
            ttl,
        }
    }

    pub(super) fn get(&self, token_hash: &str) -> Option<User> {
        let now = Instant::now();
        let entry = {
            let state = self
                .state
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            if state
                .revoked
                .get(token_hash)
                .is_some_and(|expires_at| *expires_at > now)
            {
                return None;
            }
            state.entries.get(token_hash).cloned()
        }?;

        if entry.expires_at > now {
            return Some(entry.user);
        }

        self.remove(token_hash);
        None
    }

    pub(super) fn insert(&self, token_hash: String, user: User) {
        let now = Instant::now();
        let mut state = self
            .state
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        state.revoked.retain(|_, expires_at| *expires_at > now);
        if state.revoked.contains_key(&token_hash) {
            return;
        }
        state.entries.retain(|_, entry| entry.expires_at > now);
        if self.max_entries == 0 {
            return;
        }
        if state.entries.len() >= self.max_entries && !state.entries.contains_key(&token_hash) {
            let oldest_key = state
                .entries
                .iter()
                .min_by_key(|(_, entry)| entry.expires_at)
                .map(|(key, _)| key.clone());
            if let Some(oldest_key) = oldest_key {
                state.entries.remove(&oldest_key);
            }
        }

        state.entries.insert(
            token_hash,
            CacheEntry {
                expires_at: now + self.ttl,
                user,
            },
        );
    }

    pub(super) fn remove(&self, token_hash: &str) {
        self.state
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .entries
            .remove(token_hash);
    }

    pub(super) fn revoke(&self, token_hash: String) {
        let now = Instant::now();
        let mut state = self
            .state
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        state.entries.remove(&token_hash);
        state.revoked.retain(|_, expires_at| *expires_at > now);
        state.revoked.insert(token_hash, now + self.ttl);
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_auth_session_cache.rs"]
mod tests;

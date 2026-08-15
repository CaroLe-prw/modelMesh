use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use crate::domain::UserId;

#[derive(Clone)]
pub(super) struct UserActivityTracker {
    inner: Arc<Mutex<UserActivityState>>,
    write_interval: Duration,
}

struct UserActivityState {
    last_pruned_at: Instant,
    recorded_at: HashMap<UserId, Instant>,
}

impl UserActivityTracker {
    pub(super) fn new(write_interval: Duration) -> Self {
        Self {
            inner: Arc::new(Mutex::new(UserActivityState {
                last_pruned_at: Instant::now(),
                recorded_at: HashMap::new(),
            })),
            write_interval,
        }
    }

    pub(super) fn claim(&self, user_id: UserId) -> bool {
        let now = Instant::now();
        let mut state = self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        if now.saturating_duration_since(state.last_pruned_at) >= self.write_interval {
            state.recorded_at.retain(|_, recorded_at| {
                now.saturating_duration_since(*recorded_at) < self.write_interval
            });
            state.last_pruned_at = now;
        }
        if state.recorded_at.contains_key(&user_id) {
            return false;
        }

        state.recorded_at.insert(user_id, now);
        true
    }

    pub(super) fn mark_recorded(&self, user_id: UserId) {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .recorded_at
            .insert(user_id, Instant::now());
    }

    pub(super) fn release(&self, user_id: UserId) {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .recorded_at
            .remove(&user_id);
    }
}

#[cfg(test)]
#[path = "../../tests/unit/services_user_activity_tracker.rs"]
mod tests;

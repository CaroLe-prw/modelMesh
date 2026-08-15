use std::{thread, time::Duration};

use super::UserActivityTracker;

#[test]
fn repeated_activity_is_debounced_until_the_write_interval_expires() {
    let tracker = UserActivityTracker::new(Duration::from_millis(5));

    assert!(tracker.claim(42));
    assert!(!tracker.claim(42));

    thread::sleep(Duration::from_millis(10));

    assert!(tracker.claim(42));
}

#[test]
fn failed_activity_writes_can_be_retried_immediately() {
    let tracker = UserActivityTracker::new(Duration::from_secs(60));

    assert!(tracker.claim(42));
    tracker.release(42);

    assert!(tracker.claim(42));
}

#[test]
fn recorded_logins_are_debounced_like_regular_activity() {
    let tracker = UserActivityTracker::new(Duration::from_secs(60));

    tracker.mark_recorded(42);

    assert!(!tracker.claim(42));
}

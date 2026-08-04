use std::path::Path;

use jiff::civil::Date;

use super::{log_file_name, resolve_log_directory};

#[test]
fn daily_log_file_uses_compact_local_date() {
    let date = Date::new(2026, 8, 9).expect("test date should be valid");

    assert_eq!(log_file_name(date), "20260809.log");
}

#[test]
fn relative_log_directory_is_resolved_from_backend_manifest() {
    assert_eq!(
        resolve_log_directory(Path::new("/workspace/backend"), Path::new("logs")),
        Path::new("/workspace/backend/logs")
    );
}

#[test]
fn absolute_log_directory_is_kept() {
    assert_eq!(
        resolve_log_directory(
            Path::new("/workspace/backend"),
            Path::new("/var/log/modelmesh")
        ),
        Path::new("/var/log/modelmesh")
    );
}

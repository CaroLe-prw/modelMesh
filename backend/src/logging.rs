use std::{
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};

use jiff::{Zoned, civil::Date};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::EnvFilter;

use crate::config::AppConfig;

pub struct LoggingGuard {
    _file_writer_guard: Option<WorkerGuard>,
}

pub fn initialize(config: &AppConfig, manifest_directory: &Path) -> io::Result<LoggingGuard> {
    let filter = create_filter(&config.log_filter)?;

    if config.environment.writes_log_files() {
        return initialize_file_logging(config, manifest_directory, filter);
    }

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .try_init()
        .map_err(io::Error::other)?;

    Ok(LoggingGuard {
        _file_writer_guard: None,
    })
}

fn initialize_file_logging(
    config: &AppConfig,
    manifest_directory: &Path,
    filter: EnvFilter,
) -> io::Result<LoggingGuard> {
    let log_directory = resolve_log_directory(manifest_directory, &config.log_directory);
    let file_writer = DailyFileWriter::new(log_directory)?;
    let (non_blocking_writer, file_writer_guard) = tracing_appender::non_blocking(file_writer);

    tracing_subscriber::fmt()
        .with_ansi(false)
        .with_env_filter(filter)
        .with_target(true)
        .with_writer(non_blocking_writer)
        .try_init()
        .map_err(io::Error::other)?;

    Ok(LoggingGuard {
        _file_writer_guard: Some(file_writer_guard),
    })
}

fn create_filter(value: &str) -> io::Result<EnvFilter> {
    EnvFilter::try_new(value).map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("MODELMESH_LOG_FILTER is invalid: {error}"),
        )
    })
}

fn resolve_log_directory(manifest_directory: &Path, configured_directory: &Path) -> PathBuf {
    if configured_directory.is_absolute() {
        return configured_directory.to_owned();
    }

    manifest_directory.join(configured_directory)
}

fn log_file_name(date: Date) -> String {
    format!("{:04}{:02}{:02}.log", date.year(), date.month(), date.day())
}

struct DailyFileWriter {
    current_date: Date,
    directory: PathBuf,
    file: File,
}

impl DailyFileWriter {
    fn new(directory: PathBuf) -> io::Result<Self> {
        fs::create_dir_all(&directory)?;
        let current_date = Zoned::now().date();
        let file = open_log_file(&directory, current_date)?;

        Ok(Self {
            current_date,
            directory,
            file,
        })
    }

    fn rotate_if_needed(&mut self) -> io::Result<()> {
        let current_date = Zoned::now().date();
        if current_date == self.current_date {
            return Ok(());
        }

        self.file = open_log_file(&self.directory, current_date)?;
        self.current_date = current_date;
        Ok(())
    }
}

impl Write for DailyFileWriter {
    fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
        self.rotate_if_needed()?;
        self.file.write(buffer)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.file.flush()
    }
}

fn open_log_file(directory: &Path, date: Date) -> io::Result<File> {
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join(log_file_name(date)))
}

#[cfg(test)]
#[path = "../tests/unit/logging.rs"]
mod tests;

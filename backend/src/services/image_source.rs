pub const MAX_RASTER_IMAGE_DATA_URL_LENGTH: usize = 2_796_300;

pub fn is_valid_raster_image_data_url(value: &str) -> bool {
    let payload = [
        "data:image/png;base64,",
        "data:image/jpeg;base64,",
        "data:image/webp;base64,",
    ]
    .into_iter()
    .find_map(|prefix| value.strip_prefix(prefix));

    value.len() <= MAX_RASTER_IMAGE_DATA_URL_LENGTH
        && payload.is_some_and(|payload| {
            !payload.is_empty()
                && payload
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'='))
        })
}

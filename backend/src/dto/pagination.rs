use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, de::Visitor};

use crate::domain::Pagination;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginationQuery {
    #[serde(default = "default_page", deserialize_with = "deserialize_u32")]
    pub page: u32,
    #[serde(default = "default_page_size", deserialize_with = "deserialize_u32")]
    pub page_size: u32,
}

impl TryFrom<PaginationQuery> for Pagination {
    type Error = ();

    fn try_from(query: PaginationQuery) -> Result<Self, Self::Error> {
        Self::new(query.page, query.page_size).ok_or(())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub pagination: PaginationResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginationResponse {
    pub page: u32,
    pub page_size: u32,
    pub total: u64,
    pub total_pages: u64,
}

impl PaginationResponse {
    pub fn new(pagination: Pagination, total: u64) -> Self {
        Self {
            page: pagination.page(),
            page_size: pagination.page_size(),
            total,
            total_pages: pagination.total_pages(total),
        }
    }
}

const fn default_page() -> u32 {
    1
}

const fn default_page_size() -> u32 {
    10
}

fn deserialize_u32<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    struct U32Visitor;

    impl Visitor<'_> for U32Visitor {
        type Value = u32;

        fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter.write_str("a non-negative 32-bit integer")
        }

        fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            u32::try_from(value).map_err(E::custom)
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            value.parse().map_err(E::custom)
        }
    }

    deserializer.deserialize_any(U32Visitor)
}

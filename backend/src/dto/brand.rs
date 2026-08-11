use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use crate::domain::{Brand, BrandStatus};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBrandsQuery {
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub status: Option<BrandStatusValue>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBrandRequest {
    pub id: String,
    pub name: String,
    pub preset_id: Option<String>,
    pub avatar_url: Option<String>,
    pub sort_order: i32,
    pub status: BrandStatusValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBrandRequest {
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrandStatusRequest {
    pub status: BrandStatusValue,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BrandStatusValue {
    Active,
    Hidden,
}

impl From<BrandStatusValue> for BrandStatus {
    fn from(status: BrandStatusValue) -> Self {
        match status {
            BrandStatusValue::Active => Self::Active,
            BrandStatusValue::Hidden => Self::Hidden,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrandResponse {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_svg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub model_count: u64,
    pub merchant_count: u64,
    pub sort_order: i32,
    pub status: &'static str,
    pub updated_at: Timestamp,
}

impl From<Brand> for BrandResponse {
    fn from(brand: Brand) -> Self {
        Self {
            id: brand.identifier,
            name: brand.name,
            avatar_svg: brand.avatar_svg,
            avatar_url: brand.avatar_url,
            model_count: brand.model_count,
            merchant_count: brand.merchant_count,
            sort_order: brand.sort_order,
            status: brand.status.as_str(),
            updated_at: brand.updated_at,
        }
    }
}

use serde::Serialize;

use crate::domain::BrandPreset;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrandPresetResponse {
    pub id: String,
    pub name: String,
    pub subtitle: String,
    pub avatar_svg: String,
    pub sort_order: i32,
}

impl From<BrandPreset> for BrandPresetResponse {
    fn from(preset: BrandPreset) -> Self {
        Self {
            id: preset.identifier,
            name: preset.name,
            subtitle: preset.subtitle,
            avatar_svg: preset.avatar_svg,
            sort_order: preset.sort_order,
        }
    }
}

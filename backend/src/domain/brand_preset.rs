#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BrandPreset {
    pub database_id: i64,
    pub identifier: String,
    pub name: String,
    pub subtitle: String,
    pub avatar_svg: String,
    pub sort_order: i32,
}

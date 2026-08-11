use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};

use crate::{domain::BrandPreset, entity::brand_preset, repository::RepositoryError};

#[derive(Clone)]
pub struct BrandPresetRepository {
    database: DatabaseConnection,
}

impl BrandPresetRepository {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn list_enabled(&self) -> Result<Vec<BrandPreset>, RepositoryError> {
        let presets = brand_preset::Entity::find()
            .filter(brand_preset::Column::Enabled.eq(true))
            .order_by_asc(brand_preset::Column::SortOrder)
            .order_by_asc(brand_preset::Column::Id)
            .all(&self.database)
            .await?
            .into_iter()
            .map(brand_preset_from_model)
            .collect();

        Ok(presets)
    }

    pub async fn find_enabled(
        &self,
        identifier: &str,
    ) -> Result<Option<BrandPreset>, RepositoryError> {
        Ok(brand_preset::Entity::find()
            .filter(brand_preset::Column::Enabled.eq(true))
            .filter(brand_preset::Column::Identifier.eq(identifier))
            .one(&self.database)
            .await?
            .map(brand_preset_from_model))
    }
}

fn brand_preset_from_model(model: brand_preset::Model) -> BrandPreset {
    BrandPreset {
        database_id: model.id,
        identifier: model.identifier,
        name: model.name,
        subtitle: model.subtitle,
        avatar_svg: model.avatar_svg,
        sort_order: model.sort_order,
    }
}

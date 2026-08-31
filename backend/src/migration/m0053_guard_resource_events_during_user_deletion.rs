use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        replace_trigger_functions(manager, true).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        replace_trigger_functions(manager, false).await
    }
}

async fn replace_trigger_functions(
    manager: &SchemaManager<'_>,
    guard_user_deletion: bool,
) -> Result<(), DbErr> {
    let channel_user_guard = if guard_user_deletion {
        "IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.merchant_user_id) THEN\n            RETURN OLD;\n        END IF;"
    } else {
        ""
    };
    let model_user_guard = channel_user_guard;
    let statement = format!(
        r#"
CREATE OR REPLACE FUNCTION record_merchant_channel_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    lifecycle_action TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        {channel_user_guard}
        INSERT INTO merchant_resource_events (
            merchant_user_id,
            resource_type,
            resource_id,
            resource_name,
            action
        ) VALUES (
            OLD.merchant_user_id,
            'channel',
            OLD.id,
            OLD.name,
            'delete'
        );
        RETURN OLD;
    END IF;

    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    lifecycle_action = CASE NEW.status
        WHEN 'active' THEN 'activate'
        WHEN 'offline' THEN 'offline'
        ELSE NULL
    END;

    IF lifecycle_action IS NOT NULL THEN
        INSERT INTO merchant_resource_events (
            merchant_user_id,
            resource_type,
            resource_id,
            resource_name,
            action
        ) VALUES (
            NEW.merchant_user_id,
            'channel',
            NEW.id,
            NEW.name,
            lifecycle_action
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_merchant_model_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    lifecycle_action TEXT;
    model_identifier TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        {model_user_guard}
        SELECT identifier INTO model_identifier
        FROM models
        WHERE id = OLD.model_id;

        INSERT INTO merchant_resource_events (
            merchant_user_id,
            resource_type,
            resource_id,
            resource_name,
            action
        ) VALUES (
            OLD.merchant_user_id,
            'model',
            OLD.id,
            COALESCE(model_identifier, CONCAT('model-', OLD.model_id)),
            'delete'
        );
        RETURN OLD;
    END IF;

    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    lifecycle_action = CASE NEW.status
        WHEN 'published' THEN 'activate'
        WHEN 'offline' THEN 'offline'
        ELSE NULL
    END;

    IF lifecycle_action IS NOT NULL THEN
        SELECT identifier INTO model_identifier
        FROM models
        WHERE id = NEW.model_id;

        INSERT INTO merchant_resource_events (
            merchant_user_id,
            resource_type,
            resource_id,
            resource_name,
            action
        ) VALUES (
            NEW.merchant_user_id,
            'model',
            NEW.id,
            COALESCE(model_identifier, CONCAT('model-', NEW.model_id)),
            lifecycle_action
        );
    END IF;

    RETURN NEW;
END;
$$;
"#,
    );

    manager
        .get_connection()
        .execute_unprepared(&statement)
        .await?;

    Ok(())
}

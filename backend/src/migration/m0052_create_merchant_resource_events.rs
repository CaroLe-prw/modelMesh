use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
CREATE TABLE merchant_resource_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(16) NOT NULL,
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    action VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_resource_events_type_valid
        CHECK (resource_type IN ('channel', 'model')),
    CONSTRAINT merchant_resource_events_name_not_blank CHECK (BTRIM(resource_name) <> ''),
    CONSTRAINT merchant_resource_events_action_valid
        CHECK (action IN ('activate', 'offline', 'delete'))
);

COMMENT ON TABLE merchant_resource_events IS '商户渠道与模型上线、下架和删除操作的不可变生命周期日志';
COMMENT ON COLUMN merchant_resource_events.id IS '生命周期日志自增唯一标识';
COMMENT ON COLUMN merchant_resource_events.merchant_user_id IS '执行或拥有该资源操作的商户用户标识';
COMMENT ON COLUMN merchant_resource_events.resource_type IS '资源类型：channel 渠道或 model 模型';
COMMENT ON COLUMN merchant_resource_events.resource_id IS '操作发生时的渠道或商户模型内部 UUID，资源删除后仍保留';
COMMENT ON COLUMN merchant_resource_events.resource_name IS '操作发生时快照保存的渠道名称或模型标识';
COMMENT ON COLUMN merchant_resource_events.action IS '生命周期动作：activate 上线、offline 下架或 delete 删除';
COMMENT ON COLUMN merchant_resource_events.created_at IS '生命周期操作实际发生时间';

CREATE INDEX merchant_resource_events_user_created_at_idx
    ON merchant_resource_events (merchant_user_id, created_at DESC, id DESC);
CREATE INDEX merchant_resource_events_resource_idx
    ON merchant_resource_events (resource_type, resource_id, created_at DESC);

CREATE FUNCTION record_merchant_channel_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    lifecycle_action TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
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

CREATE TRIGGER merchant_channels_lifecycle_event
AFTER UPDATE OF status OR DELETE ON merchant_channels
FOR EACH ROW
EXECUTE FUNCTION record_merchant_channel_lifecycle_event();

CREATE FUNCTION record_merchant_model_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    lifecycle_action TEXT;
    model_identifier TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
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

CREATE TRIGGER merchant_model_listings_lifecycle_event
AFTER UPDATE OF status OR DELETE ON merchant_model_listings
FOR EACH ROW
EXECUTE FUNCTION record_merchant_model_lifecycle_event();
"#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
DROP TRIGGER IF EXISTS merchant_model_listings_lifecycle_event ON merchant_model_listings;
DROP FUNCTION IF EXISTS record_merchant_model_lifecycle_event();
DROP TRIGGER IF EXISTS merchant_channels_lifecycle_event ON merchant_channels;
DROP FUNCTION IF EXISTS record_merchant_channel_lifecycle_event();
DROP TABLE merchant_resource_events;
"#,
            )
            .await?;

        Ok(())
    }
}

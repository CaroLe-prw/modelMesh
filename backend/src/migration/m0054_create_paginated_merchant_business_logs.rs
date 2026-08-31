use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[sea_orm_migration::async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP_SQL).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DOWN_SQL)
            .await?;

        Ok(())
    }
}

const UP_SQL: &str = r#"
DROP TRIGGER IF EXISTS merchant_model_listings_lifecycle_event ON merchant_model_listings;
DROP FUNCTION IF EXISTS record_merchant_model_lifecycle_event();
DROP TRIGGER IF EXISTS merchant_channels_lifecycle_event ON merchant_channels;
DROP FUNCTION IF EXISTS record_merchant_channel_lifecycle_event();

ALTER TABLE merchant_resource_events RENAME TO merchant_business_logs;
ALTER TABLE merchant_business_logs RENAME COLUMN resource_name TO subject;
ALTER TABLE merchant_business_logs RENAME COLUMN created_at TO submitted_at;
ALTER TABLE merchant_business_logs
    ALTER COLUMN action DROP NOT NULL,
    ADD COLUMN origin VARCHAR(24),
    ADD COLUMN request_type VARCHAR(24),
    ADD COLUMN description TEXT NOT NULL DEFAULT '',
    ADD COLUMN status VARCHAR(24),
    ADD COLUMN review_note TEXT NOT NULL DEFAULT '',
    ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE merchant_business_logs
SET origin = CASE resource_type
        WHEN 'channel' THEN 'channel_lifecycle'
        ELSE 'model_lifecycle'
    END,
    request_type = CASE resource_type
        WHEN 'channel' THEN 'channel_operation'
        ELSE 'model_operation'
    END,
    status = 'completed',
    updated_at = submitted_at;

ALTER TABLE merchant_business_logs
    ALTER COLUMN origin SET NOT NULL,
    ALTER COLUMN request_type SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    DROP CONSTRAINT merchant_resource_events_type_valid,
    DROP CONSTRAINT merchant_resource_events_name_not_blank,
    DROP CONSTRAINT merchant_resource_events_action_valid,
    ADD CONSTRAINT merchant_business_logs_origin_valid CHECK (
        origin IN (
            'manual',
            'channel_review',
            'model_review',
            'channel_lifecycle',
            'model_lifecycle'
        )
    ),
    ADD CONSTRAINT merchant_business_logs_resource_type_valid
        CHECK (resource_type IN ('manual', 'channel', 'model')),
    ADD CONSTRAINT merchant_business_logs_request_type_valid CHECK (
        request_type IN (
            'channel_access',
            'model_review',
            'quota_adjustment',
            'channel_operation',
            'model_operation'
        )
    ),
    ADD CONSTRAINT merchant_business_logs_subject_not_blank CHECK (BTRIM(subject) <> ''),
    ADD CONSTRAINT merchant_business_logs_action_valid CHECK (
        action IS NULL OR action IN (
            'publish',
            'price_change',
            'unpublish',
            'violation',
            'activate',
            'offline',
            'delete'
        )
    ),
    ADD CONSTRAINT merchant_business_logs_status_valid CHECK (
        status IN ('pending', 'changes_requested', 'approved', 'completed', 'cancelled')
    ),
    ADD CONSTRAINT merchant_business_logs_origin_resource_valid CHECK (
        (origin = 'manual' AND resource_type = 'manual' AND action IS NULL)
        OR (origin = 'channel_review' AND resource_type = 'channel' AND action IS NOT NULL)
        OR (origin = 'model_review' AND resource_type = 'model' AND action IS NOT NULL)
        OR (origin = 'channel_lifecycle' AND resource_type = 'channel' AND action IS NOT NULL)
        OR (origin = 'model_lifecycle' AND resource_type = 'model' AND action IS NOT NULL)
    );

ALTER INDEX merchant_resource_events_user_created_at_idx
    RENAME TO merchant_business_logs_user_updated_at_idx;
ALTER INDEX merchant_resource_events_resource_idx
    RENAME TO merchant_business_logs_resource_idx;

COMMENT ON TABLE merchant_business_logs IS '商户手动业务申请、渠道与模型审核、生命周期操作的统一可分页日志';
COMMENT ON COLUMN merchant_business_logs.id IS '业务日志自增唯一标识';
COMMENT ON COLUMN merchant_business_logs.merchant_user_id IS '拥有该业务日志的商户用户标识';
COMMENT ON COLUMN merchant_business_logs.origin IS '日志来源：手动申请、渠道或模型审核、渠道或模型生命周期';
COMMENT ON COLUMN merchant_business_logs.resource_type IS '关联对象类型：manual、channel 或 model';
COMMENT ON COLUMN merchant_business_logs.resource_id IS '关联申请、渠道或商户模型的稳定 UUID，资源删除后仍保留';
COMMENT ON COLUMN merchant_business_logs.request_type IS '前端展示的记录类型';
COMMENT ON COLUMN merchant_business_logs.subject IS '申请主题或操作发生时快照保存的资源名称';
COMMENT ON COLUMN merchant_business_logs.description IS '申请说明或资源展示名称快照';
COMMENT ON COLUMN merchant_business_logs.action IS '审核或生命周期动作；手动申请为空';
COMMENT ON COLUMN merchant_business_logs.status IS '日志状态：审核中、待补充、已通过、已完成或已取消';
COMMENT ON COLUMN merchant_business_logs.review_note IS '平台审核意见或需要商户补充的资料说明';
COMMENT ON COLUMN merchant_business_logs.submitted_at IS '申请提交或生命周期操作发生时间';
COMMENT ON COLUMN merchant_business_logs.updated_at IS '日志状态或审核意见最后更新时间';

INSERT INTO merchant_business_logs (
    merchant_user_id,
    origin,
    resource_type,
    resource_id,
    request_type,
    subject,
    description,
    action,
    status,
    review_note,
    submitted_at,
    updated_at
)
SELECT
    merchant_user_id,
    'manual',
    'manual',
    id,
    request_type,
    subject,
    description,
    NULL,
    status,
    review_note,
    created_at,
    updated_at
FROM merchant_requests;

INSERT INTO merchant_business_logs (
    merchant_user_id,
    origin,
    resource_type,
    resource_id,
    request_type,
    subject,
    description,
    action,
    status,
    review_note,
    submitted_at,
    updated_at
)
SELECT
    merchant_user_id,
    'channel_review',
    'channel',
    id,
    'channel_access',
    name,
    description,
    review_action,
    CASE status
        WHEN 'pending' THEN 'pending'
        WHEN 'rejected' THEN 'changes_requested'
        ELSE 'approved'
    END,
    review_note,
    review_submitted_at,
    updated_at
FROM merchant_channels;

INSERT INTO merchant_business_logs (
    merchant_user_id,
    origin,
    resource_type,
    resource_id,
    request_type,
    subject,
    description,
    action,
    status,
    review_note,
    submitted_at,
    updated_at
)
SELECT
    listing.merchant_user_id,
    'model_review',
    'model',
    listing.id,
    'model_review',
    managed.identifier,
    managed.name,
    listing.review_action,
    CASE listing.review_status
        WHEN 'pending' THEN 'pending'
        WHEN 'rejected' THEN 'changes_requested'
        ELSE 'approved'
    END,
    listing.review_note,
    listing.review_submitted_at,
    listing.updated_at
FROM merchant_model_listings AS listing
JOIN models AS managed ON managed.id = listing.model_id;

CREATE UNIQUE INDEX merchant_business_logs_review_round_unique
    ON merchant_business_logs (origin, resource_type, resource_id, submitted_at)
    WHERE origin IN ('channel_review', 'model_review');
CREATE UNIQUE INDEX merchant_business_logs_delete_unique
    ON merchant_business_logs (resource_type, resource_id, action)
    WHERE action = 'delete';

CREATE FUNCTION record_merchant_channel_business_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    review_status TEXT;
    lifecycle_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        review_status = CASE NEW.status
            WHEN 'pending' THEN 'pending'
            WHEN 'rejected' THEN 'changes_requested'
            ELSE 'approved'
        END;
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            NEW.merchant_user_id, 'channel_review', 'channel', NEW.id, 'channel_access',
            NEW.name, NEW.description, NEW.review_action, review_status, NEW.review_note,
            NEW.review_submitted_at, NEW.updated_at
        )
        ON CONFLICT DO NOTHING;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.merchant_user_id) THEN
            RETURN OLD;
        END IF;
        UPDATE merchant_business_logs
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE resource_type = 'channel'
          AND resource_id = OLD.id
          AND origin = 'channel_review'
          AND status IN ('pending', 'changes_requested');
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            OLD.merchant_user_id, 'channel_lifecycle', 'channel', OLD.id, 'channel_operation',
            OLD.name, OLD.description, 'delete', 'completed', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
        RETURN OLD;
    END IF;

    IF NEW.review_submitted_at IS DISTINCT FROM OLD.review_submitted_at
        AND NEW.status = 'pending'
    THEN
        UPDATE merchant_business_logs
        SET status = 'cancelled', updated_at = NEW.review_submitted_at
        WHERE resource_type = 'channel'
          AND resource_id = NEW.id
          AND origin = 'channel_review'
          AND status = 'pending';
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            NEW.merchant_user_id, 'channel_review', 'channel', NEW.id, 'channel_access',
            NEW.name, NEW.description, NEW.review_action, 'pending', NEW.review_note,
            NEW.review_submitted_at, NEW.updated_at
        )
        ON CONFLICT DO NOTHING;
    ELSIF NEW.review_submitted_at IS NOT DISTINCT FROM OLD.review_submitted_at
        AND NEW.status <> 'pending'
        AND (
            (
                NEW.status IS DISTINCT FROM OLD.status
                AND NOT (
                    OLD.status IN ('active', 'offline')
                    AND NEW.status IN ('active', 'offline')
                )
            )
            OR NEW.review_note IS DISTINCT FROM OLD.review_note
        )
    THEN
        review_status = CASE NEW.status
            WHEN 'pending' THEN 'pending'
            WHEN 'rejected' THEN 'changes_requested'
            ELSE 'approved'
        END;
        UPDATE merchant_business_logs
        SET status = review_status,
            review_note = NEW.review_note,
            subject = NEW.name,
            description = NEW.description,
            updated_at = NEW.updated_at
        WHERE id = (
            SELECT id
            FROM merchant_business_logs
            WHERE resource_type = 'channel'
              AND resource_id = NEW.id
              AND origin = 'channel_review'
            ORDER BY submitted_at DESC, id DESC
            LIMIT 1
        );
    END IF;

    IF OLD.status IN ('active', 'offline')
        AND NEW.status IN ('active', 'offline')
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.review_submitted_at IS NOT DISTINCT FROM OLD.review_submitted_at
        AND NEW.review_note IS NOT DISTINCT FROM OLD.review_note
    THEN
        lifecycle_action = CASE NEW.status
            WHEN 'active' THEN 'activate'
            WHEN 'offline' THEN 'offline'
            ELSE NULL
        END;
        IF lifecycle_action IS NOT NULL THEN
            INSERT INTO merchant_business_logs (
                merchant_user_id, origin, resource_type, resource_id, request_type,
                subject, description, action, status, review_note, submitted_at, updated_at
            ) VALUES (
                NEW.merchant_user_id, 'channel_lifecycle', 'channel', NEW.id, 'channel_operation',
                NEW.name, NEW.description, lifecycle_action, 'completed', '',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER merchant_channels_business_log
AFTER INSERT OR UPDATE OR DELETE ON merchant_channels
FOR EACH ROW
EXECUTE FUNCTION record_merchant_channel_business_log();

CREATE FUNCTION record_merchant_model_business_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    model_identifier TEXT;
    model_name TEXT;
    review_status TEXT;
    lifecycle_action TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.merchant_user_id) THEN
            RETURN OLD;
        END IF;
        SELECT identifier, name INTO model_identifier, model_name
        FROM models WHERE id = OLD.model_id;
        UPDATE merchant_business_logs
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE resource_type = 'model'
          AND resource_id = OLD.id
          AND origin = 'model_review'
          AND status IN ('pending', 'changes_requested');
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            OLD.merchant_user_id, 'model_lifecycle', 'model', OLD.id, 'model_operation',
            COALESCE(model_identifier, CONCAT('model-', OLD.model_id)),
            COALESCE(model_name, ''), 'delete', 'completed', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
        RETURN OLD;
    END IF;

    SELECT identifier, name INTO model_identifier, model_name
    FROM models WHERE id = NEW.model_id;

    IF TG_OP = 'INSERT' THEN
        review_status = CASE NEW.review_status
            WHEN 'pending' THEN 'pending'
            WHEN 'rejected' THEN 'changes_requested'
            ELSE 'approved'
        END;
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            NEW.merchant_user_id, 'model_review', 'model', NEW.id, 'model_review',
            COALESCE(model_identifier, CONCAT('model-', NEW.model_id)),
            COALESCE(model_name, ''), NEW.review_action, review_status, NEW.review_note,
            NEW.review_submitted_at, NEW.updated_at
        )
        ON CONFLICT DO NOTHING;
        RETURN NEW;
    END IF;

    IF NEW.review_submitted_at IS DISTINCT FROM OLD.review_submitted_at THEN
        UPDATE merchant_business_logs
        SET status = 'cancelled', updated_at = NEW.review_submitted_at
        WHERE resource_type = 'model'
          AND resource_id = NEW.id
          AND origin = 'model_review'
          AND status = 'pending';
        review_status = CASE NEW.review_status
            WHEN 'pending' THEN 'pending'
            WHEN 'rejected' THEN 'changes_requested'
            ELSE 'approved'
        END;
        INSERT INTO merchant_business_logs (
            merchant_user_id, origin, resource_type, resource_id, request_type,
            subject, description, action, status, review_note, submitted_at, updated_at
        ) VALUES (
            NEW.merchant_user_id, 'model_review', 'model', NEW.id, 'model_review',
            COALESCE(model_identifier, CONCAT('model-', NEW.model_id)),
            COALESCE(model_name, ''),
            CASE WHEN NOT OLD.has_approved_price THEN 'publish' ELSE NEW.review_action END,
            review_status, NEW.review_note,
            NEW.review_submitted_at, NEW.updated_at
        )
        ON CONFLICT DO NOTHING;
    ELSIF NEW.review_submitted_at IS NOT DISTINCT FROM OLD.review_submitted_at
        AND NEW.review_status IN ('approved', 'rejected')
        AND (
            NEW.review_status IS DISTINCT FROM OLD.review_status
            OR NEW.review_note IS DISTINCT FROM OLD.review_note
        )
    THEN
        review_status = CASE NEW.review_status
            WHEN 'pending' THEN 'pending'
            WHEN 'rejected' THEN 'changes_requested'
            ELSE 'approved'
        END;
        UPDATE merchant_business_logs
        SET status = review_status,
            review_note = NEW.review_note,
            subject = COALESCE(model_identifier, subject),
            description = COALESCE(model_name, description),
            updated_at = NEW.updated_at
        WHERE id = (
            SELECT id
            FROM merchant_business_logs
            WHERE resource_type = 'model'
              AND resource_id = NEW.id
              AND origin = 'model_review'
            ORDER BY submitted_at DESC, id DESC
            LIMIT 1
        );
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
        AND NEW.review_status IS NOT DISTINCT FROM OLD.review_status
        AND NEW.review_submitted_at IS NOT DISTINCT FROM OLD.review_submitted_at
        AND NEW.review_note IS NOT DISTINCT FROM OLD.review_note
        AND NEW.has_approved_price IS NOT DISTINCT FROM OLD.has_approved_price
    THEN
        lifecycle_action = CASE NEW.status
            WHEN 'published' THEN 'activate'
            WHEN 'offline' THEN 'offline'
            ELSE NULL
        END;
        IF lifecycle_action IS NOT NULL THEN
            INSERT INTO merchant_business_logs (
                merchant_user_id, origin, resource_type, resource_id, request_type,
                subject, description, action, status, review_note, submitted_at, updated_at
            ) VALUES (
                NEW.merchant_user_id, 'model_lifecycle', 'model', NEW.id, 'model_operation',
                COALESCE(model_identifier, CONCAT('model-', NEW.model_id)),
                COALESCE(model_name, ''), lifecycle_action, 'completed', '',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER merchant_model_listings_business_log
AFTER INSERT OR UPDATE OR DELETE ON merchant_model_listings
FOR EACH ROW
EXECUTE FUNCTION record_merchant_model_business_log();
"#;

const DOWN_SQL: &str = r#"
DROP TRIGGER IF EXISTS merchant_model_listings_business_log ON merchant_model_listings;
DROP FUNCTION IF EXISTS record_merchant_model_business_log();
DROP TRIGGER IF EXISTS merchant_channels_business_log ON merchant_channels;
DROP FUNCTION IF EXISTS record_merchant_channel_business_log();

INSERT INTO merchant_requests (
    id, request_code, merchant_user_id, request_type, subject, description,
    status, review_note, created_at, updated_at
)
SELECT
    resource_id,
    CONCAT('mr_', UPPER(REPLACE(resource_id::TEXT, '-', ''))),
    merchant_user_id,
    request_type,
    subject,
    description,
    status,
    review_note,
    submitted_at,
    updated_at
FROM merchant_business_logs
WHERE origin = 'manual'
ON CONFLICT DO NOTHING;

CREATE TABLE merchant_resource_events_restore (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(16) NOT NULL,
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    action VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_resource_events_restore_type_valid
        CHECK (resource_type IN ('channel', 'model')),
    CONSTRAINT merchant_resource_events_restore_name_not_blank CHECK (BTRIM(resource_name) <> ''),
    CONSTRAINT merchant_resource_events_restore_action_valid
        CHECK (action IN ('activate', 'offline', 'delete'))
);

INSERT INTO merchant_resource_events_restore (
    id, merchant_user_id, resource_type, resource_id, resource_name, action, created_at
)
OVERRIDING SYSTEM VALUE
SELECT
    id, merchant_user_id, resource_type, resource_id, subject, action, submitted_at
FROM merchant_business_logs
WHERE origin IN ('channel_lifecycle', 'model_lifecycle');

SELECT SETVAL(
    PG_GET_SERIAL_SEQUENCE('merchant_resource_events_restore', 'id'),
    COALESCE((SELECT MAX(id) FROM merchant_resource_events_restore), 0) + 1,
    FALSE
);

DROP TABLE merchant_business_logs;
ALTER TABLE merchant_resource_events_restore RENAME TO merchant_resource_events;
ALTER TABLE merchant_resource_events
    RENAME CONSTRAINT merchant_resource_events_restore_type_valid
    TO merchant_resource_events_type_valid;
ALTER TABLE merchant_resource_events
    RENAME CONSTRAINT merchant_resource_events_restore_name_not_blank
    TO merchant_resource_events_name_not_blank;
ALTER TABLE merchant_resource_events
    RENAME CONSTRAINT merchant_resource_events_restore_action_valid
    TO merchant_resource_events_action_valid;

CREATE INDEX merchant_resource_events_user_created_at_idx
    ON merchant_resource_events (merchant_user_id, created_at DESC, id DESC);
CREATE INDEX merchant_resource_events_resource_idx
    ON merchant_resource_events (resource_type, resource_id, created_at DESC);

CREATE FUNCTION record_merchant_channel_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE lifecycle_action TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.merchant_user_id) THEN RETURN OLD; END IF;
        INSERT INTO merchant_resource_events (
            merchant_user_id, resource_type, resource_id, resource_name, action
        ) VALUES (OLD.merchant_user_id, 'channel', OLD.id, OLD.name, 'delete');
        RETURN OLD;
    END IF;
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    lifecycle_action = CASE NEW.status WHEN 'active' THEN 'activate' WHEN 'offline' THEN 'offline' ELSE NULL END;
    IF lifecycle_action IS NOT NULL THEN
        INSERT INTO merchant_resource_events (
            merchant_user_id, resource_type, resource_id, resource_name, action
        ) VALUES (NEW.merchant_user_id, 'channel', NEW.id, NEW.name, lifecycle_action);
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER merchant_channels_lifecycle_event
AFTER UPDATE OF status OR DELETE ON merchant_channels
FOR EACH ROW EXECUTE FUNCTION record_merchant_channel_lifecycle_event();

CREATE FUNCTION record_merchant_model_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE lifecycle_action TEXT; model_identifier TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.merchant_user_id) THEN RETURN OLD; END IF;
        SELECT identifier INTO model_identifier FROM models WHERE id = OLD.model_id;
        INSERT INTO merchant_resource_events (
            merchant_user_id, resource_type, resource_id, resource_name, action
        ) VALUES (
            OLD.merchant_user_id, 'model', OLD.id,
            COALESCE(model_identifier, CONCAT('model-', OLD.model_id)), 'delete'
        );
        RETURN OLD;
    END IF;
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    lifecycle_action = CASE NEW.status WHEN 'published' THEN 'activate' WHEN 'offline' THEN 'offline' ELSE NULL END;
    IF lifecycle_action IS NOT NULL THEN
        SELECT identifier INTO model_identifier FROM models WHERE id = NEW.model_id;
        INSERT INTO merchant_resource_events (
            merchant_user_id, resource_type, resource_id, resource_name, action
        ) VALUES (
            NEW.merchant_user_id, 'model', NEW.id,
            COALESCE(model_identifier, CONCAT('model-', NEW.model_id)), lifecycle_action
        );
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER merchant_model_listings_lifecycle_event
AFTER UPDATE OF status OR DELETE ON merchant_model_listings
FOR EACH ROW EXECUTE FUNCTION record_merchant_model_lifecycle_event();
"#;

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
CREATE TABLE merchant_applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    business_name VARCHAR(120) NOT NULL,
    avatar_url TEXT,
    website VARCHAR(255),
    description TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_applications_user_unique UNIQUE (user_id),
    CONSTRAINT merchant_applications_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT merchant_applications_reviewer_fk
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT merchant_applications_business_name_valid
        CHECK (CHAR_LENGTH(BTRIM(business_name)) BETWEEN 2 AND 120),
    CONSTRAINT merchant_applications_avatar_url_valid
        CHECK (avatar_url IS NULL OR CHAR_LENGTH(avatar_url) <= 2796300),
    CONSTRAINT merchant_applications_website_valid
        CHECK (website IS NULL OR CHAR_LENGTH(website) <= 255),
    CONSTRAINT merchant_applications_description_valid
        CHECK (CHAR_LENGTH(BTRIM(description)) BETWEEN 20 AND 2000),
    CONSTRAINT merchant_applications_status_valid
        CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT merchant_applications_review_note_valid
        CHECK (CHAR_LENGTH(review_note) <= 1000)
);

COMMENT ON TABLE merchant_applications IS '个人用户提交的商户身份申请及平台审核状态';
COMMENT ON COLUMN merchant_applications.id IS '数据库自动生成的商户申请唯一标识';
COMMENT ON COLUMN merchant_applications.user_id IS '提交申请的个人用户标识，每个用户保留一条当前申请';
COMMENT ON COLUMN merchant_applications.business_name IS '申请人填写的商户或团队名称';
COMMENT ON COLUMN merchant_applications.avatar_url IS '可选的商户头像，保存 HTTP(S) 图片地址或 PNG、JPEG、WebP Base64 Data URL';
COMMENT ON COLUMN merchant_applications.website IS '可选的商户网站或公开主页地址';
COMMENT ON COLUMN merchant_applications.description IS '申请人填写的业务场景与可提供资源说明';
COMMENT ON COLUMN merchant_applications.status IS '申请审核状态：默认待审核，可变更为已通过或已拒绝';
COMMENT ON COLUMN merchant_applications.review_note IS '管理员填写的审核说明，拒绝时用于指导重新提交';
COMMENT ON COLUMN merchant_applications.reviewed_by IS '最后执行审核操作的管理员用户标识';
COMMENT ON COLUMN merchant_applications.reviewed_at IS '最后一次审核完成时间';
COMMENT ON COLUMN merchant_applications.created_at IS '申请首次提交时间';
COMMENT ON COLUMN merchant_applications.updated_at IS '申请资料或审核状态最后更新时间';

INSERT INTO app_routes (route_key, path, label_key, icon_key, group_key, sort_order)
VALUES (
    'account.merchant-application',
    '/account/merchant-application',
    'pages.account.navigation.merchantApplication',
    'store',
    'personal',
    165
)
ON CONFLICT (route_key) DO NOTHING;

INSERT INTO app_route_roles (route_id, role)
SELECT id, 'personal'
FROM app_routes
WHERE route_key = 'account.merchant-application'
ON CONFLICT (route_id, role) DO NOTHING;
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
DELETE FROM app_routes
WHERE route_key = 'account.merchant-application';

DROP TABLE merchant_applications;
"#,
            )
            .await?;

        Ok(())
    }
}

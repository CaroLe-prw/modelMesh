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
CREATE TABLE merchant_settlement_method_settings (
    method VARCHAR(16) PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT NOT NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_settlement_method_settings_method_valid
        CHECK (method IN ('bank', 'alipay', 'usdt')),
    CONSTRAINT merchant_settlement_method_settings_sort_order_valid CHECK (sort_order >= 0),
    CONSTRAINT merchant_settlement_method_settings_sort_order_unique UNIQUE (sort_order)
);

COMMENT ON TABLE merchant_settlement_method_settings IS
    '系统配置中允许商户新增的结算账户类型';
COMMENT ON COLUMN merchant_settlement_method_settings.method IS
    '结算方式稳定编码：bank、alipay 或 usdt';
COMMENT ON COLUMN merchant_settlement_method_settings.is_enabled IS
    '是否允许商户使用该方式新增结算账户';
COMMENT ON COLUMN merchant_settlement_method_settings.sort_order IS
    '系统配置与商户选择器中的固定展示顺序';
COMMENT ON COLUMN merchant_settlement_method_settings.updated_by IS
    '最后修改该配置的管理员用户标识；管理员删除后为空';
COMMENT ON COLUMN merchant_settlement_method_settings.updated_at IS
    '该结算方式配置最后更新时间';

INSERT INTO merchant_settlement_method_settings (method, is_enabled, sort_order)
VALUES
    ('bank', TRUE, 10),
    ('alipay', TRUE, 30),
    ('usdt', TRUE, 40);

CREATE TABLE merchant_settlement_network_settings (
    network VARCHAR(16) PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT NOT NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_settlement_network_settings_network_valid
        CHECK (network IN ('TRC20', 'ERC20', 'BEP20', 'POLYGON')),
    CONSTRAINT merchant_settlement_network_settings_sort_order_valid CHECK (sort_order >= 0),
    CONSTRAINT merchant_settlement_network_settings_sort_order_unique UNIQUE (sort_order)
);

COMMENT ON TABLE merchant_settlement_network_settings IS
    '系统配置中允许商户新增的 USDT 到账网络';
COMMENT ON COLUMN merchant_settlement_network_settings.network IS
    'USDT 到账网络稳定编码：TRC20、ERC20、BEP20 或 POLYGON';
COMMENT ON COLUMN merchant_settlement_network_settings.is_enabled IS
    '是否允许商户使用该网络新增 USDT 结算账户';
COMMENT ON COLUMN merchant_settlement_network_settings.sort_order IS
    '系统配置与商户选择器中的固定展示顺序';
COMMENT ON COLUMN merchant_settlement_network_settings.updated_by IS
    '最后修改该配置的管理员用户标识；管理员删除后为空';
COMMENT ON COLUMN merchant_settlement_network_settings.updated_at IS
    '该 USDT 网络配置最后更新时间';

INSERT INTO merchant_settlement_network_settings (network, is_enabled, sort_order)
VALUES
    ('TRC20', TRUE, 10),
    ('ERC20', TRUE, 20),
    ('BEP20', TRUE, 30),
    ('POLYGON', TRUE, 40);
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
DROP TABLE merchant_settlement_network_settings;
DROP TABLE merchant_settlement_method_settings;
"#,
            )
            .await?;

        Ok(())
    }
}

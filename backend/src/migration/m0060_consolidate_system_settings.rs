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
CREATE TABLE system_settings (
    id SMALLINT PRIMARY KEY,
    registration_enabled BOOLEAN NOT NULL,
    withdrawal_minimum_microusd BIGINT NOT NULL,
    withdrawal_fee_bps INTEGER NOT NULL,
    platform_fee_bps INTEGER NOT NULL,
    bank_enabled BOOLEAN NOT NULL,
    alipay_enabled BOOLEAN NOT NULL,
    usdt_enabled BOOLEAN NOT NULL,
    trc20_enabled BOOLEAN NOT NULL,
    erc20_enabled BOOLEAN NOT NULL,
    bep20_enabled BOOLEAN NOT NULL,
    polygon_enabled BOOLEAN NOT NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT system_settings_singleton CHECK (id = 1),
    CONSTRAINT system_settings_withdrawal_minimum_valid
        CHECK (withdrawal_minimum_microusd > 0),
    CONSTRAINT system_settings_withdrawal_fee_valid
        CHECK (withdrawal_fee_bps BETWEEN 0 AND 10000),
    CONSTRAINT system_settings_platform_fee_valid
        CHECK (platform_fee_bps BETWEEN 0 AND 10000),
    CONSTRAINT system_settings_usdt_network_valid CHECK (
        NOT usdt_enabled
        OR trc20_enabled
        OR erc20_enabled
        OR bep20_enabled
        OR polygon_enabled
    )
);

COMMENT ON TABLE system_settings IS '平台基础系统配置单例，包含注册、财务和商户结算策略';
COMMENT ON COLUMN system_settings.id IS '固定为 1 的系统配置单例主键';
COMMENT ON COLUMN system_settings.registration_enabled IS '是否允许通过公开注册接口创建新用户';
COMMENT ON COLUMN system_settings.withdrawal_minimum_microusd IS '单次提款最低金额，单位为微美元';
COMMENT ON COLUMN system_settings.withdrawal_fee_bps IS '每次成功提款收取的费率，单位为基点';
COMMENT ON COLUMN system_settings.platform_fee_bps IS '模型调用收入中平台收取的服务费率，单位为基点';
COMMENT ON COLUMN system_settings.bank_enabled IS '是否允许商户新增银行卡结算账户';
COMMENT ON COLUMN system_settings.alipay_enabled IS '是否允许商户新增支付宝结算账户';
COMMENT ON COLUMN system_settings.usdt_enabled IS '是否允许商户新增 USDT 结算账户';
COMMENT ON COLUMN system_settings.trc20_enabled IS '是否允许商户选择 TRC20 到账网络';
COMMENT ON COLUMN system_settings.erc20_enabled IS '是否允许商户选择 ERC20 到账网络';
COMMENT ON COLUMN system_settings.bep20_enabled IS '是否允许商户选择 BEP20 到账网络';
COMMENT ON COLUMN system_settings.polygon_enabled IS '是否允许商户选择 Polygon 到账网络';
COMMENT ON COLUMN system_settings.updated_by IS '最后修改配置的管理员用户标识；管理员删除后为空';
COMMENT ON COLUMN system_settings.updated_at IS '系统配置最后更新时间';

INSERT INTO system_settings (
    id,
    registration_enabled,
    withdrawal_minimum_microusd,
    withdrawal_fee_bps,
    platform_fee_bps,
    bank_enabled,
    alipay_enabled,
    usdt_enabled,
    trc20_enabled,
    erc20_enabled,
    bep20_enabled,
    polygon_enabled
)
SELECT
    1,
    TRUE,
    10000000,
    150,
    800,
    EXISTS (
        SELECT 1 FROM merchant_settlement_method_settings
        WHERE method = 'bank' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_method_settings
        WHERE method = 'alipay' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_method_settings
        WHERE method = 'usdt' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_network_settings
        WHERE network = 'TRC20' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_network_settings
        WHERE network = 'ERC20' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_network_settings
        WHERE network = 'BEP20' AND is_enabled
    ),
    EXISTS (
        SELECT 1 FROM merchant_settlement_network_settings
        WHERE network = 'POLYGON' AND is_enabled
    );

DROP TABLE merchant_settlement_network_settings;
DROP TABLE merchant_settlement_method_settings;
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
CREATE TABLE merchant_settlement_method_settings (
    method VARCHAR(16) PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT NOT NULL UNIQUE,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_settlement_method_settings_method_valid
        CHECK (method IN ('bank', 'alipay', 'usdt')),
    CONSTRAINT merchant_settlement_method_settings_sort_order_valid CHECK (sort_order >= 0)
);

CREATE TABLE merchant_settlement_network_settings (
    network VARCHAR(16) PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT NOT NULL UNIQUE,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchant_settlement_network_settings_network_valid
        CHECK (network IN ('TRC20', 'ERC20', 'BEP20', 'POLYGON')),
    CONSTRAINT merchant_settlement_network_settings_sort_order_valid CHECK (sort_order >= 0)
);

COMMENT ON TABLE merchant_settlement_method_settings IS '系统配置中允许商户新增的结算账户类型';
COMMENT ON COLUMN merchant_settlement_method_settings.method IS '结算方式稳定编码：bank、alipay 或 usdt';
COMMENT ON COLUMN merchant_settlement_method_settings.is_enabled IS '是否允许商户使用该方式新增结算账户';
COMMENT ON COLUMN merchant_settlement_method_settings.sort_order IS '系统配置与商户选择器中的固定展示顺序';
COMMENT ON COLUMN merchant_settlement_method_settings.updated_by IS '最后修改该配置的管理员用户标识；管理员删除后为空';
COMMENT ON COLUMN merchant_settlement_method_settings.updated_at IS '该结算方式配置最后更新时间';

COMMENT ON TABLE merchant_settlement_network_settings IS '系统配置中允许商户新增的 USDT 到账网络';
COMMENT ON COLUMN merchant_settlement_network_settings.network IS 'USDT 到账网络稳定编码：TRC20、ERC20、BEP20 或 POLYGON';
COMMENT ON COLUMN merchant_settlement_network_settings.is_enabled IS '是否允许商户使用该网络新增 USDT 结算账户';
COMMENT ON COLUMN merchant_settlement_network_settings.sort_order IS '系统配置与商户选择器中的固定展示顺序';
COMMENT ON COLUMN merchant_settlement_network_settings.updated_by IS '最后修改该配置的管理员用户标识；管理员删除后为空';
COMMENT ON COLUMN merchant_settlement_network_settings.updated_at IS '该 USDT 网络配置最后更新时间';

INSERT INTO merchant_settlement_method_settings (method, is_enabled, sort_order, updated_by, updated_at)
SELECT option.method, option.is_enabled, option.sort_order, settings.updated_by, settings.updated_at
FROM system_settings AS settings
CROSS JOIN LATERAL (
    VALUES
        ('bank', settings.bank_enabled, 10),
        ('alipay', settings.alipay_enabled, 30),
        ('usdt', settings.usdt_enabled, 40)
) AS option(method, is_enabled, sort_order);

INSERT INTO merchant_settlement_network_settings (network, is_enabled, sort_order, updated_by, updated_at)
SELECT option.network, option.is_enabled, option.sort_order, settings.updated_by, settings.updated_at
FROM system_settings AS settings
CROSS JOIN LATERAL (
    VALUES
        ('TRC20', settings.trc20_enabled, 10),
        ('ERC20', settings.erc20_enabled, 20),
        ('BEP20', settings.bep20_enabled, 30),
        ('POLYGON', settings.polygon_enabled, 40)
) AS option(network, is_enabled, sort_order);

DROP TABLE system_settings;
"#,
            )
            .await?;

        Ok(())
    }
}

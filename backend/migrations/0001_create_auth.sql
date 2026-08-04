CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_normalized CHECK (email = LOWER(BTRIM(email)))
);

COMMENT ON TABLE users IS 'ModelMesh 用户账号表';
COMMENT ON COLUMN users.id IS '数据库自动生成的用户唯一标识';
COMMENT ON COLUMN users.email IS '标准化后的用户登录邮箱';
COMMENT ON COLUMN users.password_hash IS '使用 Argon2 生成的密码哈希';
COMMENT ON COLUMN users.created_at IS '账号创建时间';
COMMENT ON COLUMN users.updated_at IS '账号最后更新时间';

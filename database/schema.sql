-- schema.sql
-- ──────────
-- PostgreSQL schema for PhishGuard UK.
-- This file mirrors the SQLAlchemy models in backend/app/models/.

-- Clear existing types if they exist
DROP TYPE IF EXISTS scan_type_enum CASCADE;
DROP TYPE IF EXISTS label_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

-- Enums
CREATE TYPE user_role_enum AS ENUM ('user', 'admin');
CREATE TYPE scan_type_enum AS ENUM ('url', 'email', 'domain');
CREATE TYPE label_enum AS ENUM ('phishing', 'legitimate', 'suspicious');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verify_token VARCHAR(256),
    verify_token_expires TIMESTAMPTZ,
    verify_token_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_type scan_type_enum NOT NULL,
    input_value TEXT NOT NULL,
    label label_enum NOT NULL,
    score FLOAT NOT NULL,
    model_version VARCHAR(64) NOT NULL DEFAULT 'xgb_v1',
    feature_values JSONB,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_scans_user_id ON scans (user_id);
CREATE INDEX IF NOT EXISTS ix_scans_created_at ON scans (created_at);
CREATE INDEX IF NOT EXISTS ix_scans_id ON scans (id);

-- Scan Flags table
CREATE TABLE IF NOT EXISTS scan_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    flag_type VARCHAR(10) NOT NULL, -- 'red' or 'green'
    flag_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_scan_flags_scan_id ON scan_flags (scan_id);

-- News Cache table
CREATE TABLE IF NOT EXISTS news_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source VARCHAR(100),
    published_at TIMESTAMPTZ,
    tags JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_news_cache_fetched_at ON news_cache (fetched_at);

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) NOT NULL,
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS ix_support_tickets_created_at ON support_tickets (created_at);

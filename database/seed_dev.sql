-- seed_dev.sql
-- ────────────
-- Sample data for PhishGuard UK development.
-- Includes a test admin user, a test normal user, and some sample scans.

-- Clean up existing data to avoid PK conflicts
TRUNCATE users, scans, scan_flags, news_cache, support_tickets CASCADE;

-- 1. Create a test admin user (Password: admin123)
-- Hash generated via bcrypt (cost 12)
INSERT INTO users (id, email, password_hash, role, is_verified, is_active)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    'admin@phishguard.uk',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L6s57WyHYyMBNPa', -- password123
    'admin',
    TRUE,
    TRUE
);

-- 2. Create a test normal user (Password: user123)
INSERT INTO users (id, email, password_hash, role, is_verified, is_active)
VALUES (
    'f1e2d3c4-b5a6-9f8e-8d7c-6b5a4d3c2b1a',
    'testuser@phishguard.uk',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L6s57WyHYyMBNPa', -- password123
    'user',
    TRUE,
    TRUE
);

-- 3. Sample Scans
-- Scan A: A legitimate-looking but phishing URL mimicking Lloyds
INSERT INTO scans (id, user_id, scan_type, input_value, label, score, model_version, explanation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'f1e2d3c4-b5a6-9f8e-8d7c-6b5a4d3c2b1a',
    'url',
    'https://lloyds-verify-account.top/secure/login',
    'phishing',
    0.98,
    'xgb_v1',
    'This URL mimics the Lloyds Bank brand but uses a suspicious .top top-level domain and credential-harvesting keywords like "verify" and "secure".'
);

-- Scan B: A legitimate NatWest URL
INSERT INTO scans (id, user_id, scan_type, input_value, label, score, model_version, explanation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'f1e2d3c4-b5a6-9f8e-8d7c-6b5a4d3c2b1a',
    'url',
    'https://www.natwest.com/personal/online-banking.html',
    'legitimate',
    0.02,
    'xgb_v1',
    'This is an official NatWest domain with a valid SSL certificate and standard structural markers for legitimate retail banking services.'
);

-- 4. Sample Flags for Scan A
-- Generating IDs manually to satisfy NOT NULL constraints if DEFAULT is missing
INSERT INTO scan_flags (id, scan_id, flag_type, flag_name, description)
VALUES 
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'red', 'brand_domain_mismatch', 'Contains "lloyds" but domain is not lloydsbank.co.uk'),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'red', 'suspicious_tld', 'Uses .top TLD which is rarely used by UK banks'),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'red', 'suspicious_path', 'Contains credential harvesting keyword "verify"'),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'green', 'https_present', 'Connection uses HTTPS encryption');

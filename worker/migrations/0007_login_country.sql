-- Migration 0007: Replace exact-IP lock with country-based login restriction.
-- The ip column is retained for audit trail; login_country drives the access check.
ALTER TABLE users ADD COLUMN login_country TEXT;

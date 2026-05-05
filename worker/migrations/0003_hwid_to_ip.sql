-- Rename hwid column to ip in users table.
-- HWID fingerprinting via browser is not reliable; IP-based locking is used instead.
ALTER TABLE users RENAME COLUMN hwid TO ip;

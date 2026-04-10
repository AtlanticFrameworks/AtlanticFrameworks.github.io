-- Migration 0002: Dynamic RBAC roles + personal notes
-- Run: cd worker && wrangler d1 execute DATABASE --file=migrations/0002_rbac_notes.sql --remote

-- Dynamic custom roles (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT    NOT NULL DEFAULT '#71717a',
  hierarchy   INTEGER NOT NULL DEFAULT 0,
  permissions TEXT    NOT NULL DEFAULT '[]',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Many-to-many: staff users <-> custom roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Personal staff notes (one row per user, upserted on save)
CREATE TABLE IF NOT EXISTS notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT    NOT NULL DEFAULT '',
  pinned_tickets TEXT    NOT NULL DEFAULT '[]',
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

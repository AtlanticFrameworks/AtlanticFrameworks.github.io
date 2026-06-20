-- Migration 0006: Fix FK ON DELETE actions to prevent constraint errors on user deletion
--
-- Problem: cases, shifts, audit_logs, watchlist, and user_roles.assigned_by all
-- reference users(id) with no ON DELETE action. Deleting a user with any of these
-- records fails with SQLITE_CONSTRAINT_FOREIGNKEY.
--
-- Fix:
--   cases.moderator_id     → ON DELETE SET NULL (preserve case history)
--   shifts.user_id         → ON DELETE CASCADE  (remove orphaned shift sessions)
--   audit_logs.user_id     → ON DELETE SET NULL (preserve audit trail)
--   watchlist.added_by_id  → ON DELETE SET NULL (preserve watchlist entries)
--   user_roles.assigned_by → ON DELETE SET NULL (preserve role assignments)
--
-- SQLite cannot ALTER COLUMN constraints; tables must be recreated.

-- ── cases ─────────────────────────────────────────────────────────────────────
CREATE TABLE cases_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id      TEXT    NOT NULL UNIQUE,
  target_roblox_id TEXT    NOT NULL,
  target_username  TEXT    NOT NULL,
  moderator_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type             TEXT    NOT NULL,
  reason           TEXT    NOT NULL,
  evidence         TEXT,
  notes            TEXT,
  duration_days    INTEGER,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO cases_new SELECT * FROM cases;
DROP TABLE cases;
ALTER TABLE cases_new RENAME TO cases;
CREATE INDEX IF NOT EXISTS idx_cases_moderator ON cases(moderator_id);
CREATE INDEX IF NOT EXISTS idx_cases_target_roblox_id ON cases(target_roblox_id);

-- ── shifts ────────────────────────────────────────────────────────────────────
CREATE TABLE shifts_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_time       TEXT    NOT NULL,
  end_time         TEXT,
  duration_seconds INTEGER,
  cases_count      INTEGER NOT NULL DEFAULT 0,
  bans_count       INTEGER NOT NULL DEFAULT 0,
  warns_count      INTEGER NOT NULL DEFAULT 0,
  kicks_count      INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  status           TEXT    NOT NULL DEFAULT 'ACTIVE',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO shifts_new SELECT * FROM shifts;
DROP TABLE shifts;
ALTER TABLE shifts_new RENAME TO shifts;
CREATE INDEX IF NOT EXISTS idx_shifts_user_status ON shifts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_endtime ON shifts(end_time);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,
  resource    TEXT    NOT NULL,
  resource_id TEXT,
  metadata    TEXT,
  ip          TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO audit_logs_new SELECT * FROM audit_logs;
DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ── watchlist ─────────────────────────────────────────────────────────────────
CREATE TABLE watchlist_new (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  player_roblox_id    TEXT    NOT NULL,
  player_username     TEXT    NOT NULL,
  reason              TEXT    NOT NULL,
  added_by_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  added_by_username   TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO watchlist_new SELECT * FROM watchlist;
DROP TABLE watchlist;
ALTER TABLE watchlist_new RENAME TO watchlist;

-- ── user_roles ────────────────────────────────────────────────────────────────
CREATE TABLE user_roles_new (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by INTEGER          REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);
INSERT INTO user_roles_new SELECT * FROM user_roles;
DROP TABLE user_roles;
ALTER TABLE user_roles_new RENAME TO user_roles;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

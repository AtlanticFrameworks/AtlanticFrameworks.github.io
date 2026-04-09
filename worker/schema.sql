-- ============================================================
-- BWRP Staff Panel – D1 Schema
-- Run: npm run db:init
-- ============================================================

-- Staff members (auto-created on first login)
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  roblox_id    TEXT    NOT NULL UNIQUE,
  username     TEXT    NOT NULL,
  avatar_url   TEXT,
  role         TEXT    NOT NULL DEFAULT 'MOD',
  hwid         TEXT,
  -- OWNER | ADMIN | MOD | TRAINEE
  last_seen    TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- JWT Refresh Token sessions (enables remote logout)
CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT    NOT NULL UNIQUE,
  ip            TEXT,
  user_agent    TEXT,
  expires_at    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Moderation cases
CREATE TABLE IF NOT EXISTS cases (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id      TEXT    NOT NULL UNIQUE,
  target_roblox_id TEXT    NOT NULL,
  target_username  TEXT    NOT NULL,
  moderator_id     INTEGER NOT NULL REFERENCES users(id),
  type             TEXT    NOT NULL, -- WARN | KICK | BAN | PERMBAN
  reason           TEXT    NOT NULL,
  evidence         TEXT,             -- JSON array of URLs
  notes            TEXT,
  duration_days    INTEGER,          -- NULL = permanent
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Shift sessions
CREATE TABLE IF NOT EXISTS shifts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  start_time       TEXT    NOT NULL,
  end_time         TEXT,
  duration_seconds INTEGER,
  cases_count      INTEGER NOT NULL DEFAULT 0,
  bans_count       INTEGER NOT NULL DEFAULT 0,
  warns_count      INTEGER NOT NULL DEFAULT 0,
  kicks_count      INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  status           TEXT    NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | ENDED
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Immutable audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT    NOT NULL,
  resource    TEXT    NOT NULL,
  resource_id TEXT,
  metadata    TEXT,  -- JSON blob
  ip          TEXT,
  created_at  TEXT   NOT NULL DEFAULT (datetime('now'))
);

-- Service status (replaces mock data)
CREATE TABLE IF NOT EXISTS server_status (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  service    TEXT    NOT NULL UNIQUE,
  status     TEXT    NOT NULL DEFAULT 'UNKNOWN',
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO server_status (service, status) VALUES
  ('Roblox API',  'OPERATIONAL'),
  ('Discord Bot', 'ONLINE'),
  ('Database',    'SYNCED');

-- Watchlist for monitored players
CREATE TABLE IF NOT EXISTS watchlist (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  player_roblox_id    TEXT    NOT NULL,
  player_username     TEXT    NOT NULL,
  reason              TEXT    NOT NULL,
  added_by_id         INTEGER REFERENCES users(id),
  added_by_username   TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Rate limiting (sliding window per IP)
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    NOT NULL PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

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
  ip           TEXT,
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

-- Dynamic custom roles (RBAC)
-- permissions: JSON array of permission strings, e.g. ["KICK_PLAYERS","BAN_PLAYERS"]
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT    NOT NULL DEFAULT '#71717a',
  hierarchy   INTEGER NOT NULL DEFAULT 0,
  permissions TEXT    NOT NULL DEFAULT '[]',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Many-to-many: staff users ↔ custom roles
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
-- pinned_tickets: JSON array of { id, incident_id, type, target_username, created_at }
CREATE TABLE IF NOT EXISTS notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT    NOT NULL DEFAULT '',
  pinned_tickets TEXT    NOT NULL DEFAULT '[]',
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Divisions (/division page): picker + per-division theming
CREATE TABLE IF NOT EXISTS divisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT '#E2B007',
  icon        TEXT    NOT NULL DEFAULT 'shield',
  description TEXT    NOT NULL DEFAULT '',
  sub_roles   TEXT    NOT NULL DEFAULT '[]',  -- JSON array of strings (Unterrollen)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO divisions (slug, name, color, icon, description, sub_roles) VALUES
  ('ksk',           'KSK',              '#E2B007', 'crosshair',    'Eliteeinheit für spezielle Operationen.',        '[]'),
  ('feldjaeger',    'Feldjäger',        '#3b82f6', 'shield-alert', 'Militärpolizei der Bundeswehr.',                  '[]'),
  ('marine',        'Marine',           '#2563EB', 'anchor',       'Operationen zu Wasser.',                          '["BEK","MSK","MiTa","KSM"]'),
  ('sani',          'Sanitätsdienst',   '#ef4444', 'heart-pulse',  'Medizinische Versorgung.',                        '[]'),
  ('abc',           'ABC Abwehr',       '#10b981', 'biohazard',    'Schutz vor atomaren Bedrohungen.',                '[]'),
  ('wachbataillon', 'Wachbataillon',    '#eab308', 'flag',         'Ehrengarde und Protokoll.',                       '[]'),
  ('un',            'United Nations',   '#38bdf8', 'globe',        'Internationale Friedenssicherung.',               '[]');

-- Divisionsleitung grants — presence of a row = user leads that division.
-- Everyone below is identified purely by Roblox ID (see DivisionSessionPayload /
-- requireDivisionAuth in worker/src/middleware/auth.ts) — /division has its own
-- lightweight login, separate from the staff bwrp_access system, so none of these
-- people need a `users` row / to be staff. added_by/assigned_by store the acting
-- user's Roblox ID for the same reason.
CREATE TABLE IF NOT EXISTS division_leads (
  roblox_id   TEXT    NOT NULL,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  username    TEXT,
  assigned_by TEXT,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (roblox_id, division_id)
);

-- Division roster (Mitglieder + Unterrollen)
CREATE TABLE IF NOT EXISTS division_members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  roblox_id   TEXT,
  username    TEXT    NOT NULL,
  sub_role    TEXT    NOT NULL DEFAULT '',
  joined_at   TEXT,
  added_by    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_division_members_division ON division_members(division_id);
CREATE INDEX IF NOT EXISTS idx_division_members_roblox ON division_members(roblox_id);

-- Division-scoped strikes (0-3, temp with expiry or permanent)
CREATE TABLE IF NOT EXISTS division_strikes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  member_name TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  kind        TEXT    NOT NULL DEFAULT 'perm',
  expires_at  TEXT,
  added_by    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_division_strikes_division ON division_strikes(division_id);

-- Abmeldungen (absence sign-offs) — submitted by a logged-in member/lead/admin
-- about themselves, visible to anyone with access to that division.
CREATE TABLE IF NOT EXISTS division_signoffs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  roblox_id   TEXT    NOT NULL,
  username    TEXT    NOT NULL,
  from_date   TEXT    NOT NULL,
  to_date     TEXT,
  reason      TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_division_signoffs_division ON division_signoffs(division_id);

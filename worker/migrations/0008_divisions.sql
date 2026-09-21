-- Migration 0008: Divisions, Divisionsleitung, roster & strikes
-- Run: cd worker && wrangler d1 execute bwrp-staff --file=migrations/0008_divisions.sql --remote

CREATE TABLE IF NOT EXISTS divisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT '#E2B007',
  icon        TEXT    NOT NULL DEFAULT 'shield',
  description TEXT    NOT NULL DEFAULT '',
  sub_roles   TEXT    NOT NULL DEFAULT '[]',
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

-- Divisionsleitung grants — identified by raw Roblox user ID, not a `users` FK,
-- since a Divisionsleitung need not be staff (no row in `users`, doesn't appear on
-- the team panel) unless/until they separately log in through the normal staff gate.
CREATE TABLE IF NOT EXISTS division_leads (
  roblox_id   TEXT    NOT NULL,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  username    TEXT,
  assigned_by INTEGER REFERENCES users(id),
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
  added_by    INTEGER REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_division_members_division ON division_members(division_id);

-- Division-scoped strikes (0-3, temp with expiry or permanent)
CREATE TABLE IF NOT EXISTS division_strikes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  member_name TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  kind        TEXT    NOT NULL DEFAULT 'perm',
  expires_at  TEXT,
  added_by    INTEGER REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_division_strikes_division ON division_strikes(division_id);

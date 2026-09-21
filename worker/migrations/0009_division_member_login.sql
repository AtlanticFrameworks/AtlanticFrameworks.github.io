-- Migration 0009: Division member login + Abmeldungen
-- Run: cd worker && wrangler d1 execute bwrp-staff --file=migrations/0009_division_member_login.sql --remote
--
-- /division now has its own lightweight login (bwrp_division_access cookie,
-- see worker/src/middleware/auth.ts requireDivisionAuth) separate from the
-- staff system — anyone who completes Roblox OAuth can hold a session; access
-- is decided per-division by matching their Roblox ID against divisions,
-- division_leads and division_members, not by staff rank. That means the
-- acting user for division_members.added_by / division_strikes.added_by /
-- division_leads.assigned_by is no longer guaranteed to have a `users` row,
-- so those columns move from a `users(id)` FK to a plain Roblox ID.
--
-- Recreated rather than ALTERed — this feature only just launched, so there's
-- no meaningful production data to preserve.

DROP TABLE IF EXISTS division_leads;
CREATE TABLE division_leads (
  roblox_id   TEXT    NOT NULL,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  username    TEXT,
  assigned_by TEXT,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (roblox_id, division_id)
);

DROP TABLE IF EXISTS division_members;
CREATE TABLE division_members (
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

DROP TABLE IF EXISTS division_strikes;
CREATE TABLE division_strikes (
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

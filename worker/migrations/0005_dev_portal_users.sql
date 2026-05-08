-- Dev portal user registry (separate from the staff users table)
CREATE TABLE IF NOT EXISTS dev_portal_users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  roblox_id   TEXT NOT NULL UNIQUE,
  username    TEXT NOT NULL,
  avatar_url  TEXT DEFAULT '',
  first_seen  DATETIME DEFAULT (datetime('now')),
  last_seen   DATETIME DEFAULT (datetime('now'))
);

-- Add roblox ID of assigned user to tasks for headshot lookup
ALTER TABLE dev_tasks ADD COLUMN assigned_to_id TEXT DEFAULT '';

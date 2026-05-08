-- Developer task tracking (Kanban)
CREATE TABLE IF NOT EXISTS dev_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by_id INTEGER,
  created_by_username TEXT NOT NULL,
  assigned_to TEXT DEFAULT '',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Developer server action logs
CREATE TABLE IF NOT EXISTS dev_server_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  developer_name TEXT NOT NULL,
  developer_id INTEGER,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT (datetime('now'))
);

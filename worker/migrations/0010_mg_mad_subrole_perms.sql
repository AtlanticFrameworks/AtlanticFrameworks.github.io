-- Migration 0010: Add Militärgericht + MAD divisions, sub-role permissions
-- Run: cd worker && wrangler d1 execute bwrp-staff --file=migrations/0010_mg_mad_subrole_perms.sql --remote

INSERT OR IGNORE INTO divisions (slug, name, color, icon, description, sub_roles) VALUES
  ('mg',  'Militärgericht (MG)', '#7c3aed', 'gavel', 'Militärische Gerichtsbarkeit und Disziplinarverfahren.', '[]'),
  ('mad', 'MAD (Militärischer Abschirmdienst)', '#0d9488', 'eye', 'Aufklärung, Spionageabwehr und interne Sicherheit.', '[]');

-- Grants a division's sub-role (Unterrolle) a subset of what a full
-- Divisionsleitung can do, scoped to one resource at a time — e.g. a "Prüfer"
-- sub-role in MG could get MANAGE_STRIKES without being a full division lead.
-- Editing this table stays Divisionsleitung/system-admin only (DivisionController
-- canManage), same gate as members/strikes/appearance, so a permission holder
-- can never grant themselves more.
CREATE TABLE IF NOT EXISTS division_subrole_permissions (
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  sub_role    TEXT    NOT NULL,
  permissions TEXT    NOT NULL DEFAULT '[]',
  PRIMARY KEY (division_id, sub_role)
);

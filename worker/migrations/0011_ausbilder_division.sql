-- Migration 0011: Add Ausbilder division
-- Run: cd worker && wrangler d1 execute bwrp-staff --file=migrations/0011_ausbilder_division.sql --remote

INSERT OR IGNORE INTO divisions (slug, name, color, icon, description, sub_roles) VALUES
  ('ausbilder', 'Ausbilder', '#f97316', 'graduation-cap', 'Ausbildung und Schulung neuer Rekruten.', '[]');

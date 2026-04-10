-- ============================================================
-- BWRP Staff Panel – Performance Optimization
-- Add indexes to fix D1 storage timeout errors
-- ============================================================

-- Accelerate shift stats lookups (Total Shifts, Hours, etc.)
CREATE INDEX IF NOT EXISTS idx_shifts_user_status ON shifts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_endtime ON shifts(end_time);

-- Accelerate moderation case counts
CREATE INDEX IF NOT EXISTS idx_cases_moderator ON cases(moderator_id);
CREATE INDEX IF NOT EXISTS idx_cases_target_roblox_id ON cases(target_roblox_id);

-- Accelerate activity feed (Audit Logs)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Accelerate session management
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

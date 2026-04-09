// ============================================================
// Types & Interfaces for BWRP Worker
// ============================================================

export type Role = 'OWNER' | 'ADMIN' | 'MOD' | 'TRAINEE';
export type CaseType = 'WARN' | 'KICK' | 'BAN' | 'PERMBAN';
export type ShiftStatus = 'ACTIVE' | 'ENDED';

export const ROLE_RANK: Record<Role, number> = {
  OWNER:   4,
  ADMIN:   3,
  MOD:     2,
  TRAINEE: 1,
};

// Cloudflare Worker Env Bindings
export interface Env {
  DATABASE:            D1Database;
  JWT_SECRET:          string;
  ROBLOX_AUTH_SECRET:  string;
  DISCORD_WEBHOOK_URL: string;
  ALLOWED_ORIGIN:      string;
  ROBLOX_GROUP_ID:     string;
  ROBLOX_UNIVERSE_ID:  string;   // Roblox Universe ID
  ROBLOX_PLACE_ID:     string;   // Main place ID for server list
  ROBLOX_CLOUD_KEY:    string;   // Roblox Open Cloud API Key
  DOCS_TOTP_SECRET:    string;   // Base32 TOTP secret for /api/docs access
  ENVIRONMENT:         string;
}

// JWT Payload (decoded)
export interface JWTPayload {
  sub:      string;   // user.id (string form)
  robloxId: string;
  username: string;
  role:     Role;
  iat:      number;
  exp:      number;
}

// D1 Row Types
export interface UserRow {
  id:         number;
  roblox_id:  string;
  username:   string;
  avatar_url: string | null;
  role:       Role;
  hwid:       string | null;
  last_seen:  string | null;
  created_at: string;
}

export interface SessionRow {
  id:            number;
  user_id:       number;
  refresh_token: string;
  ip:            string | null;
  user_agent:    string | null;
  expires_at:    string;
  created_at:    string;
}

export interface CaseRow {
  id:               number;
  incident_id:      string;
  target_roblox_id: string;
  target_username:  string;
  moderator_id:     number;
  type:             CaseType;
  reason:           string;
  evidence:         string | null;  // JSON
  notes:            string | null;
  duration_days:    number | null;
  active:           number;
  created_at:       string;
}

export interface ShiftRow {
  id:               number;
  user_id:          number;
  start_time:       string;
  end_time:         string | null;
  duration_seconds: number | null;
  cases_count:      number;
  bans_count:       number;
  warns_count:      number;
  kicks_count:      number;
  notes:            string | null;
  status:           ShiftStatus;
  created_at:       string;
}

// Request context (attached by auth middleware)
export interface AuthContext {
  user: JWTPayload;
  request: Request;
  env: Env;
}

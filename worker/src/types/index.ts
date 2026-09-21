// ============================================================
// Types & Interfaces for BWRP Worker
// ============================================================

export type Role = 'OWNER' | 'ADMIN' | 'MOD' | 'TRAINEE' | 'DEV';
export type CaseType = 'WARN' | 'KICK' | 'BAN' | 'PERMBAN';
export type ShiftStatus = 'ACTIVE' | 'ENDED';

export const ROLE_RANK: Record<Role, number> = {
  OWNER:   4,
  ADMIN:   3,
  MOD:     2,
  TRAINEE: 1,
  DEV:     0,
};

// Cloudflare Worker Env Bindings
export interface Env {
  CALLBACKS:           KVNamespace;
  DATABASE:            D1Database;
  DEV_DATABASE:        D1Database;
  JWT_SECRET:          string;
  ROBLOX_AUTH_SECRET:  string;
  DISCORD_WEBHOOK_URL: string;
  GAME_DISCORD_WEBHOOK: string;
  GAME_MODERATIONS_WEBHOOK?: string;
  SCHICHT_WEBHOOK?: string;
  DISCORD_BOT_TOKEN?: string;
  ALLOWED_ORIGIN:      string;
  ROBLOX_GROUP_ID:     string;
  ROBLOX_UNIVERSE_ID:  string;   // Roblox Universe ID
  ROBLOX_PLACE_ID:     string;   // Main place ID for server list
  ROBLOX_CLOUD_KEY:    string;   // Roblox Open Cloud API Key
  ROBLOX_POSTER_AUTH:  string;   // Roblox OAuth client secret for thumbnail:read (client ID: 4476395122713340611)
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
  id:            number;
  roblox_id:     string;
  username:      string;
  avatar_url:    string | null;
  role:          Role;
  ip:            string | null;
  login_country: string | null;
  last_seen:     string | null;
  created_at:    string;
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

// ── Dynamic RBAC ─────────────────────────────────────────────────────────────

/** All granular permissions that can be toggled on a custom role. */
export const ALL_PERMISSIONS = [
  'VIEW_CASES',
  'CREATE_CASES',
  'EDIT_CASES',
  'DELETE_CASES',
  'KICK_PLAYERS',
  'BAN_PLAYERS',
  'UNBAN_PLAYERS',
  'MANAGE_WATCHLIST',
  'VIEW_ANALYTICS',
  'MANAGE_SHIFTS',
  'VIEW_SERVER_INTEL',
  'SERVER_POWER_OPS',
  'MANAGE_STAFF_ROLES',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface RoleRow {
  id:          number;
  name:        string;
  color:       string;
  hierarchy:   number;
  permissions: string;  // JSON array of Permission
  created_at:  string;
}

export interface UserRoleRow {
  user_id:     number;
  role_id:     number;
  assigned_by: number | null;
  assigned_at: string;
}

export interface NoteRow {
  id:             number;
  user_id:        number;
  content:        string;
  pinned_tickets: string;  // JSON array
  updated_at:     string;
}

// ── Divisions (Divisionsleitung RBAC) ────────────────────────────────────────
// Everyone here (system admin, Divisionsleitung, regular members) is identified
// purely by Roblox ID — see DivisionSessionPayload. `added_by`/`assigned_by`
// therefore store the acting Roblox ID, not a `users` FK (the actor need not be
// staff / have a `users` row at all).

export interface DivisionRow {
  id:          number;
  slug:        string;
  name:        string;
  color:       string;
  icon:        string;
  description: string;
  sub_roles:   string;  // JSON array of strings (Unterrollen)
  created_at:  string;
}

export interface DivisionLeadRow {
  roblox_id:   string;   // identifies the lead directly — they need not have a `users` row (may not be staff)
  division_id: number;
  username:    string | null;   // best-effort cached Roblox username for display
  assigned_by: string | null;   // acting admin's Roblox ID
  assigned_at: string;
}

export interface DivisionMemberRow {
  id:          number;
  division_id: number;
  roblox_id:   string | null;
  username:    string;
  sub_role:    string;
  joined_at:   string | null;
  added_by:    string | null;   // acting lead/admin's Roblox ID
  created_at:  string;
}

export interface DivisionStrikeRow {
  id:          number;
  division_id: number;
  member_name: string;
  count:       number;
  kind:        'temp' | 'perm';
  expires_at:  string | null;
  added_by:    string | null;   // acting lead/admin's Roblox ID
  created_at:  string;
}

export interface DivisionSignoffRow {
  id:          number;
  division_id: number;
  roblox_id:   string;
  username:    string;
  from_date:   string;
  to_date:     string | null;
  reason:      string;
  created_at:  string;
}

// A sub-role (Unterrolle) can be granted a subset of what a full Divisionsleitung
// can do, scoped to one resource — e.g. MANAGE_STRIKES without full management.
export const DIVISION_PERMISSIONS = [
  'MANAGE_MEMBERS',
  'MANAGE_STRIKES',
  'MANAGE_APPEARANCE',
  'MODERATE_SIGNOFFS',
] as const;
export type DivisionPermission = (typeof DIVISION_PERMISSIONS)[number];

export interface DivisionSubrolePermissionRow {
  division_id: number;
  sub_role:    string;
  permissions: string;  // JSON array of DivisionPermission
}

// ── Division session (separate from the staff JWTPayload/ROLE_RANK system) ───

export interface DivisionSessionPayload {
  robloxId: string;
  username: string;
  iat:      number;
  exp:      number;
}

// Request context (attached by auth middleware)
export interface AuthContext {
  user: JWTPayload;
  request: Request;
  env: Env;
}

export interface DevTaskRow {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  priority: 'low' | 'medium' | 'high';
  created_by_id: number | null;
  created_by_username: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export interface DevServerLogRow {
  id: number;
  action: string;
  developer_name: string;
  developer_id: number | null;
  status: string;
  notes: string;
  created_at: string;
}

export interface DevPortalUserRow {
  id:         number;
  roblox_id:  string;
  username:   string;
  avatar_url: string;
  first_seen: string;
  last_seen:  string;
}

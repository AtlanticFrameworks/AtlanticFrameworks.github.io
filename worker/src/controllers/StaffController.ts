import type { Env, JWTPayload } from '../types/index.js';
import { json, err, requireRole } from '../middleware/auth.js';

export class StaffController {
  // GET /api/staff/me
  static async me(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const row = await env.DATABASE
      .prepare('SELECT id, username, avatar_url, role, last_seen, created_at FROM users WHERE id = ?')
      .bind(Number(user.sub))
      .first<{ id: number; username: string; avatar_url: string | null; role: string; last_seen: string | null; created_at: string }>();
    if (!row) return err('Benutzer nicht gefunden', 404, origin);
    return json({ user: row }, 200, origin);
  }

  // GET /api/staff/sessions
  static async sessions(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const { results } = await env.DATABASE
      .prepare('SELECT id, ip, user_agent, expires_at, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC')
      .bind(Number(user.sub))
      .all();
    return json({ sessions: results }, 200, origin);
  }

  // GET /api/staff/roster  (all staff members with their custom roles)
  static async roster(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';

    // Fetch all staff
    const users = await env.DATABASE
      .prepare('SELECT id, roblox_id, username, avatar_url, role, last_seen FROM users ORDER BY username ASC')
      .all<{ id: number; roblox_id: string; username: string; avatar_url: string | null; role: string; last_seen: string | null }>();

    // Fetch all custom role assignments with role metadata in one query
    const assignments = await env.DATABASE
      .prepare(`
        SELECT ur.user_id, r.id as role_id, r.name, r.color, r.hierarchy
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        ORDER BY r.hierarchy DESC
      `)
      .all<{ user_id: number; role_id: number; name: string; color: string; hierarchy: number }>();

    // Group assignments by user_id
    const rolesByUser = new Map<number, { role_id: number; name: string; color: string; hierarchy: number }[]>();
    for (const a of assignments.results) {
      const list = rolesByUser.get(a.user_id) ?? [];
      list.push({ role_id: a.role_id, name: a.name, color: a.color, hierarchy: a.hierarchy });
      rolesByUser.set(a.user_id, list);
    }

    const roster = users.results.map(u => ({
      id:          u.id,
      roblox_id:   u.roblox_id,
      username:    u.username,
      avatar_url:  u.avatar_url,
      role:        u.role,
      last_seen:   u.last_seen,
      customRoles: rolesByUser.get(u.id) ?? [],
    }));

    return json({ roster }, 200, origin);
  }

  // GET /api/staff/status  (server_status rows)
  static async status(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const { results } = await env.DATABASE
      .prepare('SELECT service, status, updated_at FROM server_status ORDER BY id ASC')
      .all();
    return json({ status: results }, 200, origin);
  }

  // GET /api/staff/stats  (aggregated stats for the current user)
  static async stats(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const userId = Number(user.sub);
    const [shiftRow, weekRow, casesRow] = await Promise.all([
      env.DATABASE
        .prepare(`SELECT COUNT(*) as total_shifts,
                         COALESCE(SUM(duration_seconds),0) as total_seconds,
                         COALESCE(SUM(cases_count),0) as total_cases,
                         COALESCE(SUM(bans_count),0)  as total_bans
                  FROM shifts WHERE user_id = ? AND status = 'ENDED'`)
        .bind(userId).first<{ total_shifts: number; total_seconds: number; total_cases: number; total_bans: number }>(),
      env.DATABASE
        .prepare(`SELECT COALESCE(SUM(duration_seconds),0) as week_seconds,
                         COALESCE(SUM(cases_count),0) as week_cases
                  FROM shifts WHERE user_id = ? AND status = 'ENDED'
                    AND end_time >= datetime('now', '-7 days')`)
        .bind(userId).first<{ week_seconds: number; week_cases: number }>(),
      env.DATABASE
        .prepare(`SELECT COUNT(*) as cases_filed FROM cases WHERE moderator_id = ?`)
        .bind(userId).first<{ cases_filed: number }>(),
    ]);
    return json({
      total_shifts:  shiftRow?.total_shifts  ?? 0,
      total_seconds: shiftRow?.total_seconds ?? 0,
      total_cases:   shiftRow?.total_cases   ?? 0,
      total_bans:    shiftRow?.total_bans    ?? 0,
      week_seconds:  weekRow?.week_seconds   ?? 0,
      week_cases:    weekRow?.week_cases     ?? 0,
      cases_filed:   casesRow?.cases_filed   ?? 0,
    }, 200, origin);
  }

  // GET /api/staff/activity  (recent 20 audit logs — MOD+ only)
  static async activity(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    const { results } = await env.DATABASE
      .prepare(`SELECT a.action, a.resource, a.resource_id, a.created_at, u.username
                FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.id DESC LIMIT 20`)
      .all();
    return json({ activity: results }, 200, origin);
  }

  // GET /api/staff/verify — re-checks Roblox group membership; logs out clients whose rank was removed
  static async verify(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';

    const row = await env.DATABASE
      .prepare('SELECT roblox_id FROM users WHERE id = ?')
      .bind(Number(user.sub))
      .first<{ roblox_id: string }>();
    if (!row) return err('Benutzer nicht gefunden', 404, origin);

    const ALLOWED_ROLES = [
      'Group Owner', 'Ownership Team', 'Projektleitung', 'Projektverwaltung', 'Management',
      'Teamverwaltung', 'Head Administrator', 'Administrator', 'Junior Administrator',
      'Head Game Moderator', 'Game Moderator',
    ];

    try {
      const res = await fetch(`https://groups.roblox.com/v1/users/${row.roblox_id}/groups/roles`);
      // If Roblox is unreachable, fail open — don't kick on their outage
      if (!res.ok) return json({ valid: true }, 200, origin);

      const data = await res.json() as { data: Array<{ group: { id: number }; role: { name: string } }> };
      const groupId = parseInt(env.ROBLOX_GROUP_ID);
      const membership = data.data?.find((g) => g.group.id === groupId);

      if (!membership || !ALLOWED_ROLES.includes(membership.role.name)) {
        return err('Roblox-Gruppenrang nicht mehr gültig', 403, origin);
      }

      return json({ valid: true }, 200, origin);
    } catch {
      // Network error — fail open
      return json({ valid: true }, 200, origin);
    }
  }
}

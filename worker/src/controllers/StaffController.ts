import type { Env, JWTPayload } from '../types/index.js';
import { json, err } from '../middleware/auth.js';

export class StaffController {
  // GET /api/staff/me
  static async me(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const row = await env.DATABASE
      .prepare('SELECT id, username, avatar_url, role, last_seen, created_at FROM users WHERE id = ?')
      .bind(Number(user.sub))
      .first<{ id: number; username: string; avatar_url: string | null; role: string; last_seen: string | null; created_at: string }>();
    if (!row) return err('Benutzer nicht gefunden', 404);
    return json({ user: row });
  }

  // GET /api/staff/sessions
  static async sessions(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const { results } = await env.DATABASE
      .prepare('SELECT id, ip, user_agent, expires_at, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC')
      .bind(Number(user.sub))
      .all();
    return json({ sessions: results });
  }

  // GET /api/staff/roster  (all staff members — MOD+)
  static async roster(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const { results } = await env.DATABASE
      .prepare('SELECT id, roblox_id, username, avatar_url, role, last_seen FROM users ORDER BY role DESC, username ASC')
      .all();
    return json({ roster: results });
  }

  // GET /api/staff/status  (server_status rows)
  static async status(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const { results } = await env.DATABASE
      .prepare('SELECT service, status, updated_at FROM server_status ORDER BY id ASC')
      .all();
    return json({ status: results });
  }

  // GET /api/staff/stats  (aggregated stats for the current user)
  static async stats(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
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
    });
  }

  // GET /api/staff/activity  (recent 20 audit logs)
  static async activity(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const { results } = await env.DATABASE
      .prepare(`SELECT a.action, a.resource, a.resource_id, a.created_at, u.username
                FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.id DESC LIMIT 20`)
      .all();
    return json({ activity: results });
  }
}

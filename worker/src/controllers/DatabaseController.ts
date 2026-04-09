import type { Env, JWTPayload } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';

/**
 * DatabaseController – Raw D1 management, OWNER-only.
 * Every endpoint performs a role check before touching data.
 */
export class DatabaseController {

  private static owner(user: JWTPayload, origin: string): Response | null {
    if (ROLE_RANK[user.role] < ROLE_RANK['OWNER']) {
      return err('Nur OWNER darf auf das Datenbank-Panel zugreifen', 403, origin);
    }
    return null;
  }

  // ── GET /api/db/stats ──────────────────────────────────────────────────────
  static async stats(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const tables = ['users', 'sessions', 'cases', 'shifts', 'audit_logs', 'watchlist', 'rate_limits'];
    const results: Record<string, number> = {};

    await Promise.all(tables.map(async (t) => {
      const row = await env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM ${t}`).first<{ c: number }>();
      results[t] = row?.c ?? 0;
    }));

    return json({ tables: results }, 200, origin);
  }

  // ── GET /api/db/users ──────────────────────────────────────────────────────
  static async listUsers(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const url    = new URL(request.url);
    const limit  = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')  ?? '50')), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
    const search = (url.searchParams.get('search') ?? '').trim();

    const where  = search ? `WHERE username LIKE ? OR roblox_id LIKE ?` : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [rows, total] = await Promise.all([
      env.DATABASE.prepare(`SELECT id, roblox_id, username, avatar_url, role, last_seen, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .bind(...params, limit, offset).all(),
      env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).bind(...params).first<{ c: number }>(),
    ]);

    return json({ users: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }

  // ── PATCH /api/db/users/:id ────────────────────────────────────────────────
  static async updateUser(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0) return err('Ungültige User-ID', 400, origin);
    if (targetId === Number(user.sub)) return err('Eigene Rolle kann nicht geändert werden', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { role } = body;

    if (!role || !['OWNER', 'ADMIN', 'MOD', 'TRAINEE'].includes(role)) {
      return err('Ungültige Rolle. Erlaubt: OWNER, ADMIN, MOD, TRAINEE', 400, origin);
    }

    const existing = await env.DATABASE.prepare('SELECT id, username FROM users WHERE id = ?').bind(targetId).first<{ id: number; username: string }>();
    if (!existing) return err('User nicht gefunden', 404, origin);

    await env.DATABASE.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, targetId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_UPDATE_USER_ROLE', 'users', String(targetId), { username: existing.username, newRole: role }, getIP(request));

    return json({ success: true, message: `Rolle von ${existing.username} auf ${role} gesetzt.` }, 200, origin);
  }

  // ── DELETE /api/db/users/:id ───────────────────────────────────────────────
  static async deleteUser(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0) return err('Ungültige User-ID', 400, origin);
    if (targetId === Number(user.sub)) return err('Eigener Account kann nicht gelöscht werden', 400, origin);

    const existing = await env.DATABASE.prepare('SELECT id, username FROM users WHERE id = ?').bind(targetId).first<{ id: number; username: string }>();
    if (!existing) return err('User nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_DELETE_USER', 'users', String(targetId), { username: existing.username }, getIP(request));

    return json({ success: true, message: `User ${existing.username} (ID ${targetId}) gelöscht.` }, 200, origin);
  }

  // ── GET /api/db/cases ──────────────────────────────────────────────────────
  static async listCases(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const url    = new URL(request.url);
    const limit  = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')  ?? '50')), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
    const search = (url.searchParams.get('search') ?? '').trim();

    const where  = search ? `WHERE c.target_username LIKE ? OR c.target_roblox_id LIKE ? OR c.incident_id LIKE ?` : '';
    const bindParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    const [rows, total] = await Promise.all([
      env.DATABASE.prepare(`
        SELECT c.*, u.username AS moderator_username
        FROM cases c LEFT JOIN users u ON c.moderator_id = u.id
        ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?
      `).bind(...bindParams, limit, offset).all(),
      env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM cases c ${where}`).bind(...bindParams).first<{ c: number }>(),
    ]);

    return json({ cases: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }

  // ── PATCH /api/db/cases/:id ────────────────────────────────────────────────
  static async updateCase(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const caseId = parseInt(params.id);
    if (isNaN(caseId) || caseId <= 0) return err('Ungültige Case-ID', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { active, notes, reason } = body;

    const existing = await env.DATABASE.prepare('SELECT id FROM cases WHERE id = ?').bind(caseId).first();
    if (!existing) return err('Case nicht gefunden', 404, origin);

    const sets: string[] = [];
    const vals: unknown[] = [];

    if (active !== undefined) { sets.push('active = ?'); vals.push(active ? 1 : 0); }
    if (notes  !== undefined) { sets.push('notes = ?');  vals.push(notes ?? null); }
    if (reason !== undefined && typeof reason === 'string' && reason.trim()) {
      sets.push('reason = ?'); vals.push(reason.trim());
    }

    if (sets.length === 0) return err('Keine Felder zum Aktualisieren angegeben', 400, origin);

    vals.push(caseId);
    await env.DATABASE.prepare(`UPDATE cases SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_UPDATE_CASE', 'cases', String(caseId), body, getIP(request));

    return json({ success: true }, 200, origin);
  }

  // ── DELETE /api/db/cases/:id ───────────────────────────────────────────────
  static async deleteCase(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const caseId = parseInt(params.id);
    if (isNaN(caseId) || caseId <= 0) return err('Ungültige Case-ID', 400, origin);

    const existing = await env.DATABASE.prepare('SELECT id, incident_id FROM cases WHERE id = ?').bind(caseId).first<{ id: number; incident_id: string }>();
    if (!existing) return err('Case nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM cases WHERE id = ?').bind(caseId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_DELETE_CASE', 'cases', String(caseId), { incident_id: existing.incident_id }, getIP(request));

    return json({ success: true, message: `Case #${caseId} (${existing.incident_id}) gelöscht.` }, 200, origin);
  }

  // ── GET /api/db/sessions ───────────────────────────────────────────────────
  static async listSessions(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const url    = new URL(request.url);
    const limit  = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')  ?? '50')), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));

    const [rows, total] = await Promise.all([
      env.DATABASE.prepare(`
        SELECT s.id, s.user_id, s.ip, s.user_agent, s.expires_at, s.created_at, u.username, u.role
        FROM sessions s LEFT JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > datetime('now')
        ORDER BY s.created_at DESC LIMIT ? OFFSET ?
      `).bind(limit, offset).all(),
      env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')`).first<{ c: number }>(),
    ]);

    return json({ sessions: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }

  // ── DELETE /api/db/sessions/:id ────────────────────────────────────────────
  static async deleteSession(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const sessionId = parseInt(params.id);
    if (isNaN(sessionId) || sessionId <= 0) return err('Ungültige Session-ID', 400, origin);

    const existing = await env.DATABASE.prepare('SELECT id, user_id FROM sessions WHERE id = ?').bind(sessionId).first<{ id: number; user_id: number }>();
    if (!existing) return err('Session nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_REVOKE_SESSION', 'sessions', String(sessionId), { user_id: existing.user_id }, getIP(request));

    return json({ success: true, message: `Session #${sessionId} widerrufen.` }, 200, origin);
  }

  // ── GET /api/db/audit-logs ─────────────────────────────────────────────────
  static async listAuditLogs(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const url     = new URL(request.url);
    const limit   = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')  ?? '50')), 100);
    const offset  = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
    const action  = (url.searchParams.get('action') ?? '').trim();

    const where  = action ? `WHERE a.action LIKE ?` : '';
    const params = action ? [`%${action}%`] : [];

    const [rows, total] = await Promise.all([
      env.DATABASE.prepare(`
        SELECT a.id, a.action, a.resource, a.resource_id, a.metadata, a.ip, a.created_at,
               u.username AS actor_username, u.role AS actor_role
        FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
        ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all(),
      env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${where}`).bind(...params).first<{ c: number }>(),
    ]);

    return json({ logs: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }

  // ── GET /api/db/server-status ──────────────────────────────────────────────
  static async listServerStatus(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare('SELECT * FROM server_status ORDER BY service ASC').all();
    return json({ services: rows.results }, 200, origin);
  }

  // ── PATCH /api/db/server-status/:service ──────────────────────────────────
  static async updateServerStatus(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const service = decodeURIComponent(params.service ?? '').trim();
    if (!service) return err('Service-Name fehlt', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { status } = body;
    const allowed = ['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE', 'UNKNOWN', 'ONLINE', 'OFFLINE', 'SYNCED', 'ERROR'];
    if (!status || !allowed.includes(status)) {
      return err(`Ungültiger Status. Erlaubt: ${allowed.join(', ')}`, 400, origin);
    }

    const existing = await env.DATABASE.prepare('SELECT id FROM server_status WHERE service = ?').bind(service).first();
    if (!existing) {
      await env.DATABASE.prepare(`INSERT INTO server_status (service, status, updated_at) VALUES (?, ?, datetime('now'))`).bind(service, status).run();
    } else {
      await env.DATABASE.prepare(`UPDATE server_status SET status = ?, updated_at = datetime('now') WHERE service = ?`).bind(status, service).run();
    }

    await auditLog(env.DATABASE, Number(user.sub), 'DB_UPDATE_STATUS', 'server_status', service, { status }, getIP(request));
    return json({ success: true }, 200, origin);
  }

  // ── DELETE /api/db/rate-limits ─────────────────────────────────────────────
  static async clearRateLimits(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = DatabaseController.owner(user, origin);
    if (bad) return bad;

    const { meta } = await env.DATABASE.prepare('DELETE FROM rate_limits').run();
    await auditLog(env.DATABASE, Number(user.sub), 'DB_CLEAR_RATE_LIMITS', 'rate_limits', null, { rowsDeleted: meta?.changes ?? 0 }, getIP(request));

    return json({ success: true, rowsDeleted: meta?.changes ?? 0 }, 200, origin);
  }
}

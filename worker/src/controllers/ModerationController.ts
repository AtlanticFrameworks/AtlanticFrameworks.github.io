import type { Env, JWTPayload } from '../types/index.js';
import { ModerationService } from '../services/ModerationService.js';
import { requireRole, auditLog, getIP, json, err } from '../middleware/auth.js';
import type { CaseType } from '../types/index.js';

export class ModerationController {
  // GET /api/moderation/all?type=&search=&limit=50&offset=0
  static async getAllCases(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'TRAINEE');
    if (bad) return bad;

    const url    = new URL(request.url);
    const type   = url.searchParams.get('type') ?? '';
    const search = url.searchParams.get('search') ?? '';
    const limit  = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));

    const conditions: string[] = [];
    const binds: unknown[] = [];
    if (type)   { conditions.push('c.type = ?');                          binds.push(type); }
    if (search) { conditions.push('c.target_username LIKE ?');            binds.push(`%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { results } = await env.DATABASE
      .prepare(`SELECT c.*, u.username as moderator_username
                FROM cases c LEFT JOIN users u ON c.moderator_id = u.id
                ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all();

    const countRow = await env.DATABASE
      .prepare(`SELECT COUNT(*) as total FROM cases c ${where}`)
      .bind(...binds)
      .first<{ total: number }>();

    return json({ cases: results, total: countRow?.total ?? 0, limit, offset }, 200, origin);
  }

  // GET /api/moderation/cases/:playerId
  static async getCases(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'TRAINEE');
    if (bad) return bad;

    const svc   = new ModerationService(env);
    const cases = await svc.getCasesByPlayer(params.playerId);
    return json({ cases }, 200, origin);
  }

  // POST /api/moderation/cases
  static async createCase(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    let body: { targetRobloxId?: string; targetUsername?: string; type?: CaseType; reason?: string; evidence?: string[]; notes?: string; durationDays?: number };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body', 400, origin); }

    const { targetRobloxId, targetUsername, type, reason } = body;
    if (!targetRobloxId || !targetUsername || !type || !reason) return err('Pflichtfelder: targetRobloxId, targetUsername, type, reason', 400, origin);

    const VALID_TYPES: CaseType[] = ['WARN', 'KICK', 'BAN', 'PERMBAN'];
    if (!VALID_TYPES.includes(type)) return err(`Ungültiger Typ. Erlaubt: ${VALID_TYPES.join(', ')}`, 400, origin);

    const svc  = new ModerationService(env);
    const newCase = await svc.createCase({
      targetRobloxId, targetUsername,
      moderatorId:   Number(user.sub),
      moderatorName: user.username,
      type, reason,
      evidence:    body.evidence,
      notes:       body.notes,
      durationDays: body.durationDays,
    });

    await auditLog(env.DATABASE, Number(user.sub), 'CASE_CREATE', 'cases', newCase.incident_id, { type, targetRobloxId }, getIP(request));
    return json({ case: newCase }, 201, origin);
  }

  // DELETE /api/moderation/cases/:caseId
  static async deleteCase(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'TRAINEE');
    if (bad) return bad;

    const caseId = parseInt(params.caseId);
    if (isNaN(caseId) || caseId <= 0) return err('Ungültige Fall-ID', 400, origin);

    const existing = await env.DATABASE
      .prepare('SELECT id, incident_id, moderator_id FROM cases WHERE id = ?')
      .bind(caseId)
      .first<{ id: number; incident_id: string; moderator_id: number }>();
    if (!existing) return err('Fall nicht gefunden', 404, origin);

    const userId = Number(user.sub);
    const isOwner = existing.moderator_id === userId;

    if (!isOwner) {
      const roleRows = await env.DATABASE
        .prepare('SELECT r.permissions FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?')
        .bind(userId)
        .all<{ permissions: string }>();
      const hasDeletePerm = roleRows.results.some(r => {
        try { return (JSON.parse(r.permissions) as string[]).includes('DELETE_CASES'); }
        catch { return false; }
      });
      if (!hasDeletePerm) return err('Keine Berechtigung zum Löschen dieses Falls', 403, origin);
    }

    await env.DATABASE.prepare('DELETE FROM cases WHERE id = ?').bind(caseId).run();
    await auditLog(env.DATABASE, userId, 'CASE_DELETE', 'cases', String(caseId), { incidentId: existing.incident_id }, getIP(request));
    return json({ success: true }, 200, origin);
  }

  // PATCH /api/moderation/cases/:caseId
  static async updateCase(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    let body: { notes?: string; evidence?: string[] };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body', 400, origin); }

    const svc = new ModerationService(env);
    await svc.updateCase(Number(params.caseId), body);
    await auditLog(env.DATABASE, Number(user.sub), 'CASE_UPDATE', 'cases', params.caseId, {}, getIP(request));
    return json({ success: true }, 200, origin);
  }
}

import type { Env, JWTPayload } from '../types/index.js';
import { ModerationService } from '../services/ModerationService.js';
import { requireRole, auditLog, getIP, json, err } from '../middleware/auth.js';
import type { CaseType } from '../types/index.js';

export class ModerationController {
  // GET /api/moderation/cases/:playerId
  static async getCases(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    const svc   = new ModerationService(env);
    const cases = await svc.getCasesByPlayer(params.playerId);
    return json({ cases });
  }

  // POST /api/moderation/cases
  static async createCase(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    let body: { targetRobloxId?: string; targetUsername?: string; type?: CaseType; reason?: string; evidence?: string[]; notes?: string; durationDays?: number };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body'); }

    const { targetRobloxId, targetUsername, type, reason } = body;
    if (!targetRobloxId || !targetUsername || !type || !reason) return err('Pflichtfelder: targetRobloxId, targetUsername, type, reason');

    const VALID_TYPES: CaseType[] = ['WARN', 'KICK', 'BAN', 'PERMBAN'];
    if (!VALID_TYPES.includes(type)) return err(`Ungültiger Typ. Erlaubt: ${VALID_TYPES.join(', ')}`);

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
    return json({ case: newCase }, 201);
  }

  // PATCH /api/moderation/cases/:caseId
  static async updateCase(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    let body: { notes?: string; evidence?: string[] };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body'); }

    const svc = new ModerationService(env);
    await svc.updateCase(Number(params.caseId), body);
    await auditLog(env.DATABASE, Number(user.sub), 'CASE_UPDATE', 'cases', params.caseId, {}, getIP(request));
    return json({ success: true });
  }
}

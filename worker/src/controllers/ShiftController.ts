import type { Env, JWTPayload } from '../types/index.js';
import { ShiftService } from '../services/ShiftService.js';
import { requireRole, auditLog, getIP, json } from '../middleware/auth.js';

export class ShiftController {
  // POST /api/shifts/start
  static async start(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    const svc   = new ShiftService(env);
    const shift = await svc.startShift(Number(user.sub));
    await auditLog(env.DATABASE, Number(user.sub), 'SHIFT_START', 'shifts', String(shift.id), {}, getIP(request));
    return json({ shift }, 201, origin);
  }

  // POST /api/shifts/end
  static async end(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;

    let body: { cases_count?: number; bans_count?: number; warns_count?: number; kicks_count?: number; notes?: string };
    try { body = await request.json(); } catch { body = {}; }

    const svc   = new ShiftService(env);
    const shift = await svc.endShift(Number(user.sub), {
      cases_count: body.cases_count ?? 0,
      bans_count:  body.bans_count  ?? 0,
      warns_count: body.warns_count ?? 0,
      kicks_count: body.kicks_count ?? 0,
      notes:       body.notes       ?? null,
    });
    await auditLog(env.DATABASE, Number(user.sub), 'SHIFT_END', 'shifts', String(shift.id), { duration: shift.duration_seconds }, getIP(request));
    return json({ shift }, 200, origin);
  }

  // GET /api/shifts/active
  static async active(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const svc   = new ShiftService(env);
    const shift = await svc.getActiveShift(Number(_user.sub));
    return json({ shift }, 200, origin);
  }

  // GET /api/shifts/analytics
  static async analytics(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'ADMIN');
    if (bad) return bad;
    const svc    = new ShiftService(env);
    const result = await svc.getAnalytics();
    return json({ analytics: result }, 200, origin);
  }
}

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

  // GET /api/shifts/all  — full shift log for management (ADMIN+)
  static async all(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'ADMIN');
    if (bad) return bad;

    const url      = new URL(request.url);
    const limit    = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')  ?? '50')), 100);
    const offset   = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
    const sortBy   = ['total_shifts', 'total_seconds', 'total_cases', 'total_bans'].includes(url.searchParams.get('sortBy') ?? '')
      ? url.searchParams.get('sortBy')! : 'total_seconds';
    const userId   = url.searchParams.get('userId');   // optional filter by staff member
    const mode     = url.searchParams.get('mode') ?? 'summary'; // 'summary' | 'log'

    if (mode === 'summary') {
      // Per-user aggregated stats
      const where  = userId ? 'WHERE s.user_id = ? AND s.status = \'ENDED\'' : 'WHERE s.status = \'ENDED\'';
      const params: unknown[] = userId ? [userId] : [];

      const { results } = await env.DATABASE.prepare(`
        SELECT
          u.id            AS user_id,
          u.username,
          u.role,
          COUNT(s.id)             AS total_shifts,
          COALESCE(SUM(s.duration_seconds), 0) AS total_seconds,
          COALESCE(SUM(s.cases_count), 0)      AS total_cases,
          COALESCE(SUM(s.bans_count), 0)       AS total_bans,
          COALESCE(SUM(s.warns_count), 0)      AS total_warns,
          COALESCE(SUM(s.kicks_count), 0)      AS total_kicks,
          MAX(s.end_time)         AS last_shift
        FROM users u
        LEFT JOIN shifts s ON s.user_id = u.id AND s.status = 'ENDED'
        GROUP BY u.id
        ORDER BY ${sortBy} DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all();

      const total = await env.DATABASE.prepare('SELECT COUNT(*) AS c FROM users').first<{ c: number }>();
      return json({ shifts: results, total: total?.c ?? 0, limit, offset, mode }, 200, origin);
    } else {
      // Raw shift-by-shift log
      const where  = userId ? 'WHERE s.user_id = ?' : '';
      const params: unknown[] = userId ? [userId] : [];

      const [rows, total] = await Promise.all([
        env.DATABASE.prepare(`
          SELECT s.*, u.username, u.role
          FROM shifts s JOIN users u ON s.user_id = u.id
          ${where}
          ORDER BY s.start_time DESC
          LIMIT ? OFFSET ?
        `).bind(...params, limit, offset).all(),
        env.DATABASE.prepare(`SELECT COUNT(*) AS c FROM shifts s ${where}`)
          .bind(...params).first<{ c: number }>(),
      ]);

      return json({ shifts: rows.results, total: total?.c ?? 0, limit, offset, mode }, 200, origin);
    }
  }
}

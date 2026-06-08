// worker/src/controllers/CommandController.ts
import type { Env } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { verifyTOTP, signSession } from '../utils/totp.js';
import { requireCmdToken } from '../middleware/cmdAuth.js';

export class CommandController {

  // ── POST /api/cmd/auth ──────────────────────────────────────────────────
  static async auth(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (!env.DOCS_TOTP_SECRET) return err('Server-Konfigurationsfehler', 500, origin);

    const body: any = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) return err('Ungültiger Code — 6 Ziffern erwartet', 400, origin);

    const valid = await verifyTOTP(env.DOCS_TOTP_SECRET, code);
    if (!valid) return err('Falscher Code', 401, origin);

    const token = await signSession(env.DOCS_TOTP_SECRET, 120);
    const expires = Math.floor(Date.now() / 1000) + 120;

    await auditLog(env.DATABASE, null, 'CMD_AUTH', 'system', undefined, {}, getIP(request));

    return json({ token, expires }, 200, origin);
  }

  // ── GET /api/cmd/users ──────────────────────────────────────────────────
  static async listUsers(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare(
      'SELECT id, username, role FROM users ORDER BY username ASC'
    ).all<{ id: number; username: string; role: string }>();

    return json({ users: rows.results }, 200, origin);
  }

  // ── GET /api/cmd/serverstatus ───────────────────────────────────────────
  static async listServiceNames(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare(
      'SELECT service FROM server_status ORDER BY service ASC'
    ).all<{ service: string }>();

    return json({ services: rows.results.map((r: { service: string }) => r.service) }, 200, origin);
  }
}

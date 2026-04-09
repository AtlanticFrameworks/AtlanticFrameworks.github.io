import type { Env, JWTPayload } from '../types/index.js';
import { requireRole, auditLog, getIP, json, err } from '../middleware/auth.js';

export class WatchlistController {
  // GET /api/watchlist
  static async getAll(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'TRAINEE');
    if (bad) return bad;
    const { results } = await env.DATABASE
      .prepare('SELECT * FROM watchlist ORDER BY created_at DESC')
      .all();
    return json({ watchlist: results }, 200, origin);
  }

  // GET /api/watchlist/check/:robloxId
  static async check(_request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'TRAINEE');
    if (bad) return bad;
    const entry = await env.DATABASE
      .prepare('SELECT * FROM watchlist WHERE player_roblox_id = ? ORDER BY id DESC LIMIT 1')
      .bind(params.robloxId)
      .first();
    return json({ flagged: !!entry, entry: entry ?? null }, 200, origin);
  }

  // POST /api/watchlist
  static async add(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;
    let body: { playerRobloxId?: string; playerUsername?: string; reason?: string };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body', 400, origin); }
    const { playerRobloxId, playerUsername, reason } = body;
    if (!playerRobloxId || !playerUsername || !reason) return err('Pflichtfelder: playerRobloxId, playerUsername, reason', 400, origin);

    await env.DATABASE
      .prepare('INSERT INTO watchlist (player_roblox_id, player_username, reason, added_by_id, added_by_username) VALUES (?, ?, ?, ?, ?)')
      .bind(playerRobloxId, playerUsername, reason, Number(user.sub), user.username)
      .run();

    await auditLog(env.DATABASE, Number(user.sub), 'WATCHLIST_ADD', 'watchlist', playerRobloxId, { playerUsername, reason }, getIP(request));
    return json({ success: true }, 201, origin);
  }

  // DELETE /api/watchlist/:id
  static async remove(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'MOD');
    if (bad) return bad;
    await env.DATABASE.prepare('DELETE FROM watchlist WHERE id = ?').bind(Number(params.id)).run();
    await auditLog(env.DATABASE, Number(user.sub), 'WATCHLIST_REMOVE', 'watchlist', params.id, {}, getIP(request));
    return json({ success: true }, 200, origin);
  }
}

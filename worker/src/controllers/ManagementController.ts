import type { Env, JWTPayload } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';

export class ManagementController {

  private static checkAccess(user: JWTPayload, origin: string): Response | null {
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) {
      return err('Zugriff verweigert: Management-Bereich (ADMIN+ erforderlich)', 403, origin);
    }
    return null;
  }

  // ── GET /api/mgmt/users ──────────────────────────────────────────────────
  static async listStaff(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = ManagementController.checkAccess(user, origin);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare(`
      SELECT id, roblox_id, username, avatar_url, role, hwid, last_seen, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    // Mask the HWID before returning it - only return a boolean or short prefix to show if it's locked
    const staff = rows.results.map((r: any) => ({
      id: r.id,
      roblox_id: r.roblox_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      role: r.role,
      last_seen: r.last_seen,
      created_at: r.created_at,
      hwidLocked: !!r.hwid
    }));

    return json({ staff }, 200, origin);
  }

  // ── PATCH /api/mgmt/users/:id/hwid-reset ────────────────────────────────
  static async resetHwid(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = ManagementController.checkAccess(user, origin);
    if (bad) return bad;

    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0) return err('Ungültige User-ID', 400, origin);

    const existing = await env.DATABASE.prepare('SELECT id, username, hwid FROM users WHERE id = ?').bind(targetId).first<{ id: number; username: string; hwid: string }>();
    if (!existing) return err('User nicht gefunden', 404, origin);

    if (!existing.hwid) return err('HWID ist bereits zurückgesetzt', 400, origin);

    await env.DATABASE.prepare('UPDATE users SET hwid = NULL WHERE id = ?').bind(targetId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'MGMT_RESET_HWID', 'users', String(targetId), { username: existing.username }, getIP(request));

    return json({ success: true, message: `HWID-Sperre von ${existing.username} aufgehoben.` }, 200, origin);
  }

  // ── PATCH /api/mgmt/users/:id/role ───────────────────────────────────────
  static async updateRole(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = ManagementController.checkAccess(user, origin);
    if (bad) return bad;

    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0) return err('Ungültige User-ID', 400, origin);

    // Parse body for new role
    const body: any = await request.json().catch(() => ({}));
    const { role } = body;

    const allowedRoles = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
    if (!role || !allowedRoles.includes(role)) {
      return err('Ungültige Rolle angesagt.', 400, origin);
    }

    if (targetId === Number(user.sub)) {
      return err('Eigene Rolle kann nicht geändert werden', 400, origin);
    }

    const targetUser = await env.DATABASE.prepare('SELECT id, username, role FROM users WHERE id = ?').bind(targetId).first<{ id: number; username: string; role: string }>();
    if (!targetUser) return err('User nicht gefunden', 404, origin);

    const myRank = ROLE_RANK[user.role];
    const targetRank = ROLE_RANK[targetUser.role as keyof typeof ROLE_RANK];
    const newRank = ROLE_RANK[role as keyof typeof ROLE_RANK];

    // Security constraints:
    // 1. Cannot modify roles of people with equal or higher rank than yourself (unless OWNER)
    if (user.role !== 'OWNER' && targetRank >= myRank) {
      return err('Du kannst die Rolle dieses Nutzers nicht ändern, da sein aktueller Rang zu hoch ist.', 403, origin);
    }
    // 2. Cannot promote someone to your rank or higher (unless OWNER)
    if (user.role !== 'OWNER' && newRank >= myRank) {
      return err('Du kannst niemanden auf deinen eigenen oder einen höheren Rang befördern.', 403, origin);
    }

    await env.DATABASE.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, targetId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'MGMT_UPDATE_ROLE', 'users', String(targetId), { username: targetUser.username, oldRole: targetUser.role, newRole: role }, getIP(request));

    return json({ success: true, message: `Rolle von ${targetUser.username} auf ${role} geändert.` }, 200, origin);
  }
}

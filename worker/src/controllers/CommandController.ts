// worker/src/controllers/CommandController.ts
import type { Env } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { verifyTOTP, signSession } from '../utils/totp.js';
import { requireCmdToken } from '../middleware/cmdAuth.js';
import { RobloxCloudService } from '../services/RobloxCloudService.js';
import { DiscordService } from '../services/DiscordService.js';

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

  // ── PATCH /api/cmd/users/:id/reset-ip ──────────────────────────────────
  static async resetIp(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const match = new URL(request.url).pathname.match(/\/api\/cmd\/users\/(\d+)\/reset-ip$/);
    const id = match ? parseInt(match[1]) : NaN;
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username, ip FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string; ip: string | null }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);
    if (!user.ip) return err('IP-Sperre bereits zurückgesetzt', 400, origin);

    await env.DATABASE.prepare('UPDATE users SET ip = NULL WHERE id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_RESET_IP', 'users', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `IP-Sperre von ${user.username} aufgehoben.` }, 200, origin);
  }

  // ── PATCH /api/cmd/users/:id/role ──────────────────────────────────────
  static async setRole(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const match = new URL(request.url).pathname.match(/\/api\/cmd\/users\/(\d+)\/role$/);
    const id = match ? parseInt(match[1]) : NaN;
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { role } = body;
    const allowedRoles = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
    if (!role || !allowedRoles.includes(role)) return err('Ungültige Rolle. Erlaubt: OWNER, ADMIN, MOD, TRAINEE', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username, role FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string; role: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
    await auditLog(env.DATABASE, null, 'CMD_SET_ROLE', 'users', String(id), { username: user.username, oldRole: user.role, newRole: role }, getIP(request));

    return json({ success: true, message: `Rolle von ${user.username} auf ${role} gesetzt.` }, 200, origin);
  }

  // ── DELETE /api/cmd/users/:id/sessions ─────────────────────────────────
  static async clearSessions(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const match = new URL(request.url).pathname.match(/\/api\/cmd\/users\/(\d+)\/sessions$/);
    const id = match ? parseInt(match[1]) : NaN;
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_CLEAR_SESSIONS', 'sessions', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `Alle Sitzungen von ${user.username} gelöscht.` }, 200, origin);
  }

  // ── DELETE /api/cmd/users/:id ───────────────────────────────────────────
  static async deleteUser(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const match = new URL(request.url).pathname.match(/\/api\/cmd\/users\/(\d+)$/);
    const id = match ? parseInt(match[1]) : NaN;
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_DELETE_USER', 'users', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `Benutzer ${user.username} gelöscht.` }, 200, origin);
  }

  // ── POST /api/cmd/cloud/kick ────────────────────────────────────────────
  static async kick(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId, reason } = body;
    if (!robloxId || !reason) return err('robloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'KICK',
        targetId: Number(robloxId),
        reason:   reason,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_KICK', 'users', String(robloxId), { reason }, getIP(request));
      new DiscordService(env).sendMonitoringAlert('CMD Kick', `Kick-Signal für Roblox-ID **${robloxId}** — Grund: ${reason}`).catch(() => {});
      return json({ success: true, message: `Kick-Signal für ${robloxId} gesendet.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ── POST /api/cmd/cloud/ban ─────────────────────────────────────────────
  static async ban(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId, reason } = body;
    if (!robloxId || !reason) return err('robloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.banUser({ userId: Number(robloxId), reason, displayReason: reason, duration: null });
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'KICK',
        targetId: Number(robloxId),
        reason:   `[GEBANNT] ${reason}`,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_BAN', 'users', String(robloxId), { reason }, getIP(request));
      new DiscordService(env).sendMonitoringAlert('CMD Ban', `Roblox-ID **${robloxId}** wurde gesperrt — Grund: ${reason}`).catch(() => {});
      return json({ success: true, message: `${robloxId} wurde gesperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ── POST /api/cmd/cloud/unban ───────────────────────────────────────────
  static async unban(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId } = body;
    if (!robloxId) return err('robloxId ist ein Pflichtfeld', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.unbanUser(Number(robloxId));
      await auditLog(env.DATABASE, null, 'CMD_UNBAN', 'users', String(robloxId), {}, getIP(request));
      new DiscordService(env).sendMonitoringAlert('CMD Unban', `Roblox-ID **${robloxId}** wurde entsperrt.`).catch(() => {});
      return json({ success: true, message: `${robloxId} wurde entsperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ── POST /api/cmd/cloud/shutdown ────────────────────────────────────────
  static async shutdownServer(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { serverJobId } = body;
    if (!serverJobId || typeof serverJobId !== 'string') return err('serverJobId ist ein Pflichtfeld', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'SHUTDOWN_SERVER',
        jobId:    serverJobId,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_SHUTDOWN_SERVER', 'servers', serverJobId, {}, getIP(request));
      return json({ success: true, message: `Shutdown-Signal an ${serverJobId.slice(0, 8)}... gesendet.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ── POST /api/cmd/cloud/restart-all ────────────────────────────────────
  static async restartAll(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:          'RESTART_ALL',
        excludeJobIds: [],
        issuedBy:      'CMD-TERMINAL',
        issuedAt:      new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_RESTART_ALL', 'servers', undefined, {}, getIP(request));
      return json({ success: true, message: 'Restart-Signal an alle Server gesendet.' }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
}

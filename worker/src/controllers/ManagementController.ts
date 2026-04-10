import type { Env, JWTPayload } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';
import { DiscordService } from '../services/DiscordService.js';

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

    // Fetch all user→role assignments in one query
    const roleRows = await env.DATABASE.prepare(`
      SELECT ur.user_id, r.id as role_id, r.name, r.color, r.hierarchy
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      ORDER BY r.hierarchy DESC
    `).all<{ user_id: number; role_id: number; name: string; color: string; hierarchy: number }>();

    // Group by user_id
    const rolesByUser = new Map<number, { role_id: number; name: string; color: string; hierarchy: number }[]>();
    for (const rr of roleRows.results) {
      const list = rolesByUser.get(rr.user_id) ?? [];
      list.push({ role_id: rr.role_id, name: rr.name, color: rr.color, hierarchy: rr.hierarchy });
      rolesByUser.set(rr.user_id, list);
    }

    const staff = rows.results.map((r: any) => ({
      id: r.id,
      roblox_id: r.roblox_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      role: r.role,
      last_seen: r.last_seen,
      created_at: r.created_at,
      hwidLocked: !!r.hwid,
      customRoles: rolesByUser.get(r.id) ?? [],
    }));

    return json({ staff }, 200, origin);
  }

  // ── GET /api/mgmt/users/:id/activity ─────────────────────────────────────
  static async getUserActivity(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = ManagementController.checkAccess(user, origin);
    if (bad) return bad;

    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0) return err('Ungültige User-ID', 400, origin);

    const targetUser = await env.DATABASE.prepare(
      'SELECT id, username, role, avatar_url, created_at, last_seen FROM users WHERE id = ?'
    ).bind(targetId).first<any>();
    if (!targetUser) return err('User nicht gefunden', 404, origin);

    // Last 20 audit log entries for this user
    const logs = await env.DATABASE.prepare(`
      SELECT action, resource, resource_id, metadata, created_at
      FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(targetId).all<any>();

    // Shift stats
    const shiftStats = await env.DATABASE.prepare(`
      SELECT COUNT(*) as total_shifts,
             SUM(duration_seconds) as total_seconds,
             SUM(cases_count) as total_cases,
             SUM(bans_count) as total_bans
      FROM shifts
      WHERE user_id = ? AND status = 'ENDED'
    `).bind(targetId).first<any>();

    // Case stats
    const caseStats = await env.DATABASE.prepare(`
      SELECT COUNT(*) as total_cases,
             SUM(CASE WHEN type = 'BAN' OR type = 'PERMBAN' THEN 1 ELSE 0 END) as bans,
             SUM(CASE WHEN type = 'WARN' THEN 1 ELSE 0 END) as warns,
             SUM(CASE WHEN type = 'KICK' THEN 1 ELSE 0 END) as kicks
      FROM cases
      WHERE moderator_id = ?
    `).bind(targetId).first<any>();

    // Assigned custom roles
    const customRoles = await env.DATABASE.prepare(`
      SELECT r.id, r.name, r.color, r.hierarchy, ur.assigned_at
      FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.hierarchy DESC
    `).bind(targetId).all<any>();

    return json({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
        avatarUrl: targetUser.avatar_url,
        createdAt: targetUser.created_at,
        lastSeen: targetUser.last_seen,
      },
      customRoles: customRoles.results,
      shiftStats: {
        totalShifts:  shiftStats?.total_shifts  ?? 0,
        totalSeconds: shiftStats?.total_seconds  ?? 0,
        totalCases:   shiftStats?.total_cases    ?? 0,
        totalBans:    shiftStats?.total_bans     ?? 0,
      },
      caseStats: {
        total: caseStats?.total_cases ?? 0,
        bans:  caseStats?.bans        ?? 0,
        warns: caseStats?.warns       ?? 0,
        kicks: caseStats?.kicks       ?? 0,
      },
      recentActivity: logs.results.map((l: any) => ({
        action:     l.action,
        resource:   l.resource,
        resourceId: l.resource_id,
        metadata:   l.metadata ? JSON.parse(l.metadata) : null,
        createdAt:  l.created_at,
      })),
    }, 200, origin);
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
    new DiscordService(env).sendMonitoringAlert('Staff HWID Reset', `**${user.username}** hat die HWID-Sperre für **${existing.username}** (ID: ${targetId}) aufgehoben.`).catch(() => {});

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
    new DiscordService(env).sendMonitoringAlert('Staff Role Update', `**${user.username}** hat den Rang von **${targetUser.username}** von \`${targetUser.role}\` zu \`${role}\` geändert.`).catch(() => {});

    return json({ success: true, message: `Rolle von ${targetUser.username} auf ${role} geändert.` }, 200, origin);
  }
}

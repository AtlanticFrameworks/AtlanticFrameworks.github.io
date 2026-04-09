import type { Env, JWTPayload } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { RobloxCloudService } from '../services/RobloxCloudService.js';
import { DiscordService } from '../services/DiscordService.js';
import { ROLE_RANK } from '../types/index.js';

/**
 * CloudController – Exposes Roblox Open Cloud actions via the Staff Panel API.
 * All endpoints require at minimum MOD rank.
 */
export class CloudController {

  // ─── POST /api/cloud/kick ──────────────────────────────────────────────────
  /**
   * Sends a kick signal via MessagingService to all live servers.
   * The in-game script must be subscribed to the "StaffPanelUpdates" topic.
   * Body: { targetRobloxId, targetUsername, reason }
   */
  static async kick(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung', 403, origin);

    const body: any = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername, reason } = body;
    if (!targetRobloxId || !reason) return err('targetRobloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0) return err('targetRobloxId muss eine gültige Roblox-ID sein', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:       'KICK',
        targetId:   Number(targetRobloxId),
        reason:     reason,
        issuedBy:   user.username,
        issuedAt:   new Date().toISOString(),
      });

      await auditLog(env.DATABASE, Number(user.sub), 'CLOUD_KICK', 'users', String(targetRobloxId), { targetUsername, reason }, getIP(request));
      new DiscordService(env).sendCloudKick({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId, reason }).catch(e => console.error('[Discord] kick webhook:', (e as Error).message));

      return json({ success: true, message: `Kick-Signal für ${targetUsername ?? targetRobloxId} gesendet.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ─── POST /api/cloud/ban ───────────────────────────────────────────────────
  /**
   * Natively bans a user at universe level via Open Cloud UserRestrictions.
   * Body: { targetRobloxId, targetUsername, reason, displayReason, durationDays? }
   */
  static async ban(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung', 403, origin);

    const body: any = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername, reason, displayReason, durationDays } = body;
    if (!targetRobloxId || !reason) return err('targetRobloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0) return err('targetRobloxId muss eine gültige Roblox-ID sein', 400, origin);
    if (durationDays !== undefined && durationDays !== null && (isNaN(Number(durationDays)) || Number(durationDays) < 1)) return err('durationDays muss eine positive Zahl sein', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      const duration = durationDays ? `P${durationDays}D` : null;
      await cloud.banUser({
        userId:        Number(targetRobloxId),
        reason:        reason,
        displayReason: displayReason || reason,
        duration:      duration,
      });

      // Also kick them immediately via MessagingService
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'KICK',
        targetId: Number(targetRobloxId),
        reason:   `[GEBANNT] ${displayReason || reason}`,
        issuedBy: user.username,
        issuedAt: new Date().toISOString(),
      });

      await auditLog(env.DATABASE, Number(user.sub), 'CLOUD_BAN', 'users', String(targetRobloxId), { targetUsername, reason, durationDays }, getIP(request));
      new DiscordService(env).sendCloudBan({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId, reason, displayReason: displayReason || reason, durationDays: durationDays ?? null }).catch(e => console.error('[Discord] ban webhook:', (e as Error).message));

      return json({ success: true, message: `${targetUsername ?? targetRobloxId} wurde gesperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ─── POST /api/cloud/unban ─────────────────────────────────────────────────
  /**
   * Removes a native universe ban via Open Cloud.
   * Body: { targetRobloxId, targetUsername }
   */
  static async unban(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Nur ADMIN+ kann entbannen', 403, origin);

    const body: any = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername } = body;
    if (!targetRobloxId) return err('targetRobloxId ist ein Pflichtfeld', 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0) return err('targetRobloxId muss eine gültige Roblox-ID sein', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.unbanUser(Number(targetRobloxId));

      await auditLog(env.DATABASE, Number(user.sub), 'CLOUD_UNBAN', 'users', String(targetRobloxId), { targetUsername }, getIP(request));
      new DiscordService(env).sendCloudUnban({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId }).catch(e => console.error('[Discord] unban webhook:', (e as Error).message));

      return json({ success: true, message: `${targetUsername ?? targetRobloxId} wurde entsperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }

  // ─── GET /api/cloud/restriction/:userId ────────────────────────────────────
  /**
   * Checks the current ban/restriction state of a user.
   */
  static async getRestriction(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung', 403, origin);

    const { userId } = params;
    if (!userId) return err('userId fehlt', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      const data  = await cloud.getRestriction(Number(userId));
      return json(data, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
}

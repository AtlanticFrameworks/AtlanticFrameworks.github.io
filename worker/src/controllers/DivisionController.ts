import type { Env, DivisionRow, DivisionMemberRow, DivisionStrikeRow, DivisionSignoffRow, DivisionSessionPayload, DivisionPermission } from '../types/index.js';
import { DIVISION_PERMISSIONS } from '../types/index.js';
import { json, err, auditLog, getIP, signJWT, setCookie, clearCookie } from '../middleware/auth.js';
import { resolveUsername } from './RobloxController.js';
import { AuthService } from '../services/AuthService.js';

// The division system administrator is hardcoded to this one Roblox account (username,
// not display name/nickname) — intentionally independent of the general staff rank
// ladder (OWNER etc.), per explicit request. Compared case-insensitively since Roblox
// usernames are case-insensitive at login.
const SYSTEM_ADMIN_ROBLOX_USERNAME = 'thatzanex';

function isSystemAdminUser(actor: DivisionSessionPayload): boolean {
  return actor.username?.toLowerCase() === SYSTEM_ADMIN_ROBLOX_USERNAME;
}

/**
 * DivisionController – /division page backend.
 *
 * /division has its own lightweight login (bwrp_division_access cookie),
 * separate from the staff bwrp_access system — anyone who completes Roblox
 * OAuth can hold a session; DivisionController decides what they can do by
 * matching their Roblox ID against divisions/division_leads/division_members,
 * not by staff rank. Most division members are not staff at all.
 *
 * Route summary:
 *   POST   /api/divisions/auth/login              → exchange an OAuth code for a division session (public)
 *   POST   /api/divisions/auth/logout              → clear the division session (public)
 *   GET    /api/divisions/auth/me                  → current division session identity
 *   GET    /api/divisions                          → list all divisions (public)
 *   GET    /api/divisions/:slug                    → division detail + roster (public)
 *   PATCH  /api/divisions/:slug                    → update color/description/sub_roles (system admin or lead) — icon is fixed
 *   POST   /api/divisions/:slug/members             → add roster member (system admin or lead)
 *   PATCH  /api/divisions/:slug/members/:id        → edit roster member (system admin or lead)
 *   DELETE /api/divisions/:slug/members/:id        → remove roster member (system admin or lead)
 *   GET    /api/divisions/:slug/strikes             → list strikes (system admin or lead)
 *   POST   /api/divisions/:slug/strikes             → add strike (system admin or lead)
 *   PATCH  /api/divisions/:slug/strikes/:id        → edit strike (system admin or lead)
 *   DELETE /api/divisions/:slug/strikes/:id        → remove strike (system admin or lead)
 *   GET    /api/divisions/:slug/signoffs            → list Abmeldungen (system admin, lead, or member of that division)
 *   POST   /api/divisions/:slug/signoffs            → submit an Abmeldung for yourself (system admin, lead, or member)
 *   DELETE /api/divisions/:slug/signoffs/:id        → remove an Abmeldung (its own submitter, or system admin/lead)
 *   GET    /api/divisions/:slug/subrole-permissions              → permissions granted to each Unterrolle (system admin or lead)
 *   PATCH  /api/divisions/:slug/subrole-permissions/:subRole     → set an Unterrolle's permissions (system admin or lead) —
 *                                                                   never delegable, so a permission holder can't grant themselves more
 *   GET    /api/divisions/leads/me                  → divisions the caller leads/is a member of, + permissions from their Unterrolle
 *   GET    /api/divisions/:slug/leads               → list Divisionsleitung for a division (system admin only)
 *   POST   /api/divisions/:slug/leads/:identifier    → assign Divisionsleitung by Roblox user ID or username (system admin only) —
 *                                                       the target need not have a `users` row / be staff
 *   DELETE /api/divisions/:slug/leads/:robloxId     → remove Divisionsleitung (system admin only)
 */
export class DivisionController {

  private static origin(env: Env) { return env.ALLOWED_ORIGIN ?? 'https://bwrp.net'; }

  private static async getDivisionBySlug(env: Env, slug: string): Promise<DivisionRow | null> {
    return env.DATABASE.prepare('SELECT * FROM divisions WHERE slug = ?').bind(slug).first<DivisionRow>();
  }

  /** The system admin manages every division; a Divisionsleitung only their own. */
  private static async canManage(env: Env, actor: DivisionSessionPayload, divisionId: number): Promise<boolean> {
    if (isSystemAdminUser(actor)) return true;
    const lead = await env.DATABASE
      .prepare('SELECT 1 FROM division_leads WHERE roblox_id = ? AND division_id = ?')
      .bind(actor.robloxId, divisionId)
      .first();
    return !!lead;
  }

  /** canManage(), plus a plain roster member of that division (read + Abmeldung access). */
  private static async canAccess(env: Env, actor: DivisionSessionPayload, divisionId: number): Promise<boolean> {
    if (await DivisionController.canManage(env, actor, divisionId)) return true;
    const member = await env.DATABASE
      .prepare('SELECT 1 FROM division_members WHERE roblox_id = ? AND division_id = ?')
      .bind(actor.robloxId, divisionId)
      .first();
    return !!member;
  }

  /**
   * canManage(), OR a plain member whose Unterrolle has been granted this specific
   * permission via division_subrole_permissions. Lets a Divisionsleitung delegate
   * one resource (e.g. MANAGE_STRIKES) without making someone a full lead.
   */
  private static async hasPermission(env: Env, actor: DivisionSessionPayload, divisionId: number, permission: DivisionPermission): Promise<boolean> {
    if (await DivisionController.canManage(env, actor, divisionId)) return true;
    const member = await env.DATABASE
      .prepare('SELECT sub_role FROM division_members WHERE roblox_id = ? AND division_id = ? AND sub_role != \'\'')
      .bind(actor.robloxId, divisionId)
      .first<{ sub_role: string }>();
    if (!member) return false;
    const row = await env.DATABASE
      .prepare('SELECT permissions FROM division_subrole_permissions WHERE division_id = ? AND sub_role = ?')
      .bind(divisionId, member.sub_role)
      .first<{ permissions: string }>();
    if (!row) return false;
    const perms: string[] = JSON.parse(row.permissions ?? '[]');
    return perms.includes(permission);
  }

  // ══════════════════════════════ Auth ══════════════════════════════════════

  // ─── POST /api/divisions/auth/login ───────────────────────────────────────────
  static async login(request: Request, env: Env): Promise<Response> {
    const o = DivisionController.origin(env);
    let body: { code?: string; redirect_uri?: string };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body', 400, o); }
    if (!body.code) return err('Fehlender OAuth-Code', 400, o);

    let roblox: { robloxId: string; username: string };
    try {
      roblox = await new AuthService(env).exchangeCode(body.code, body.redirect_uri ?? 'https://bwrp.net/team');
    } catch (e) {
      return err((e as Error).message, 400, o);
    }

    const isAdmin = roblox.username.toLowerCase() === SYSTEM_ADMIN_ROBLOX_USERNAME;
    const isLead = await env.DATABASE.prepare('SELECT 1 FROM division_leads WHERE roblox_id = ? LIMIT 1').bind(roblox.robloxId).first();
    const isMember = await env.DATABASE.prepare('SELECT 1 FROM division_members WHERE roblox_id = ? LIMIT 1').bind(roblox.robloxId).first();
    if (!isAdmin && !isLead && !isMember) {
      return err('Dieser Roblox-Account ist keiner Division zugeordnet.', 403, o);
    }

    const now = Math.floor(Date.now() / 1000);
    const SEVEN_DAYS = 7 * 24 * 60 * 60;
    const token = await signJWT({ robloxId: roblox.robloxId, username: roblox.username, iat: now, exp: now + SEVEN_DAYS }, env.JWT_SECRET);

    await auditLog(env.DATABASE, null, 'DIVISION_LOGIN', 'division_session', roblox.robloxId, { username: roblox.username }, getIP(request));

    return json(
      { success: true, user: { robloxId: roblox.robloxId, username: roblox.username } },
      200, o,
      { 'Set-Cookie': setCookie('bwrp_division_access', token, SEVEN_DAYS) },
    );
  }

  // ─── POST /api/divisions/auth/logout ──────────────────────────────────────────
  static async logout(_request: Request, env: Env): Promise<Response> {
    const o = DivisionController.origin(env);
    return json({ success: true }, 200, o, { 'Set-Cookie': clearCookie('bwrp_division_access') });
  }

  // ─── GET /api/divisions/auth/me ───────────────────────────────────────────────
  static async me(_req: Request, env: Env, actor: DivisionSessionPayload): Promise<Response> {
    const o = DivisionController.origin(env);
    return json({ user: { robloxId: actor.robloxId, username: actor.username } }, 200, o);
  }

  // ══════════════════════════════ Divisions ═════════════════════════════════

  // ─── GET /api/divisions ───────────────────────────────────────────────────────
  static async list(_req: Request, env: Env): Promise<Response> {
    const o = DivisionController.origin(env);
    const rows = await env.DATABASE.prepare('SELECT * FROM divisions ORDER BY name ASC').all<DivisionRow>();
    const divisions = rows.results.map(d => ({ ...d, sub_roles: JSON.parse(d.sub_roles ?? '[]') }));
    return json({ divisions }, 200, o);
  }

  // ─── GET /api/divisions/:slug ─────────────────────────────────────────────────
  // Public route — params aren't passed to UserlessHandlers, so parse the slug here.
  static async getOne(request: Request, env: Env): Promise<Response> {
    const o = DivisionController.origin(env);
    const match = new URL(request.url).pathname.match(/^\/api\/divisions\/([^/]+)$/);
    const slug = match?.[1];
    if (!slug) return err('Ungültiger Pfad', 400, o);

    const division = await DivisionController.getDivisionBySlug(env, slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const members = await env.DATABASE
      .prepare('SELECT id, roblox_id, username, sub_role, joined_at, created_at FROM division_members WHERE division_id = ? ORDER BY sub_role ASC, username ASC')
      .bind(division.id)
      .all<DivisionMemberRow>();

    return json({
      division: { ...division, sub_roles: JSON.parse(division.sub_roles ?? '[]') },
      members: members.results,
    }, 200, o);
  }

  // ─── PATCH /api/divisions/:slug ───────────────────────────────────────────────
  static async update(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_APPEARANCE'))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const color       = body.color       !== undefined ? String(body.color)       : division.color;
    const description = body.description !== undefined ? String(body.description) : division.description;
    const subRoles     = body.sub_roles  !== undefined ? body.sub_roles           : JSON.parse(division.sub_roles ?? '[]');
    // icon is intentionally NOT editable — locked to the set defined on divisions.html.

    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return err('Ungültige Farbe (erwartet #RRGGBB)', 400, o);
    if (description.length > 500) return err('Beschreibung zu lang (max. 500 Zeichen)', 400, o);
    if (!Array.isArray(subRoles) || subRoles.length > 12 || subRoles.some((s: unknown) => typeof s !== 'string' || s.trim().length < 1 || s.trim().length > 20)) {
      return err('Ungültige Unterrollen (max. 12, je 1-20 Zeichen)', 400, o);
    }
    const cleanSubRoles = subRoles.map((s: string) => s.trim());

    await env.DATABASE
      .prepare('UPDATE divisions SET color = ?, description = ?, sub_roles = ? WHERE id = ?')
      .bind(color, description, JSON.stringify(cleanSubRoles), division.id)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_UPDATE', 'divisions', String(division.id), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ══════════════════════════════ Members ═══════════════════════════════════

  // ─── POST /api/divisions/:slug/members ────────────────────────────────────────
  static async addMember(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_MEMBERS'))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const username = String(body.username ?? '').trim();
    const robloxId = body.robloxId ? String(body.robloxId).trim() : null;
    const subRole  = body.subRole ? String(body.subRole).trim() : '';
    const joinedAt = body.joinedAt ? String(body.joinedAt) : null;

    if (username.length < 2) return err('Name muss mindestens 2 Zeichen haben', 400, o);
    if (robloxId && !/^\d+$/.test(robloxId)) return err('Ungültige Roblox User-ID', 400, o);
    const allowedSubRoles: string[] = JSON.parse(division.sub_roles ?? '[]');
    if (subRole && !allowedSubRoles.includes(subRole)) return err('Ungültige Unterrolle für diese Division', 400, o);

    const result = await env.DATABASE
      .prepare('INSERT INTO division_members (division_id, roblox_id, username, sub_role, joined_at, added_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(division.id, robloxId, username, subRole, joinedAt, actor.robloxId)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_MEMBER_ADD', 'division_members', String(result.meta.last_row_id), { slug: division.slug, username, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── PATCH /api/divisions/:slug/members/:id ───────────────────────────────────
  static async updateMember(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_MEMBERS'))) return err('Zugriff verweigert', 403, o);

    const memberId = parseInt(params.id);
    if (isNaN(memberId)) return err('Ungültige Mitglieds-ID', 400, o);
    const existing = await env.DATABASE.prepare('SELECT * FROM division_members WHERE id = ? AND division_id = ?').bind(memberId, division.id).first<DivisionMemberRow>();
    if (!existing) return err('Mitglied nicht gefunden', 404, o);

    const body: any = await request.json().catch(() => ({}));
    const username = body.username !== undefined ? String(body.username).trim() : existing.username;
    const robloxId = body.robloxId !== undefined ? (body.robloxId ? String(body.robloxId).trim() : null) : existing.roblox_id;
    const subRole  = body.subRole  !== undefined ? String(body.subRole).trim() : existing.sub_role;
    const joinedAt = body.joinedAt !== undefined ? (body.joinedAt ? String(body.joinedAt) : null) : existing.joined_at;

    if (username.length < 2) return err('Name muss mindestens 2 Zeichen haben', 400, o);
    if (robloxId && !/^\d+$/.test(robloxId)) return err('Ungültige Roblox User-ID', 400, o);
    const allowedSubRoles: string[] = JSON.parse(division.sub_roles ?? '[]');
    if (subRole && !allowedSubRoles.includes(subRole)) return err('Ungültige Unterrolle für diese Division', 400, o);

    await env.DATABASE
      .prepare('UPDATE division_members SET username = ?, roblox_id = ?, sub_role = ?, joined_at = ? WHERE id = ?')
      .bind(username, robloxId, subRole, joinedAt, memberId)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_MEMBER_UPDATE', 'division_members', String(memberId), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/members/:id ──────────────────────────────────
  static async removeMember(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_MEMBERS'))) return err('Zugriff verweigert', 403, o);

    const memberId = parseInt(params.id);
    if (isNaN(memberId)) return err('Ungültige Mitglieds-ID', 400, o);

    await env.DATABASE.prepare('DELETE FROM division_members WHERE id = ? AND division_id = ?').bind(memberId, division.id).run();
    await auditLog(env.DATABASE, null, 'DIVISION_MEMBER_REMOVE', 'division_members', String(memberId), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ══════════════════════════════ Strikes ════════════════════════════════════

  // ─── GET /api/divisions/:slug/strikes ─────────────────────────────────────────
  static async listStrikes(_req: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_STRIKES'))) return err('Zugriff verweigert', 403, o);

    const now = new Date().toISOString();
    // Drop expired temp strikes, mirroring the mockup's auto-cleanup behaviour.
    await env.DATABASE.prepare(`DELETE FROM division_strikes WHERE division_id = ? AND kind = 'temp' AND expires_at IS NOT NULL AND expires_at <= ?`).bind(division.id, now).run();

    const rows = await env.DATABASE.prepare('SELECT * FROM division_strikes WHERE division_id = ? ORDER BY created_at DESC').bind(division.id).all<DivisionStrikeRow>();
    return json({ strikes: rows.results }, 200, o);
  }

  // ─── POST /api/divisions/:slug/strikes ────────────────────────────────────────
  static async addStrike(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_STRIKES'))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const memberName = String(body.memberName ?? '').trim();
    const count = Number(body.count);
    const kind = body.kind === 'temp' ? 'temp' : 'perm';
    const expiresAt = kind === 'temp' && body.expiresAt ? String(body.expiresAt) : null;

    if (memberName.length < 2) return err('Name muss mindestens 2 Zeichen haben', 400, o);
    if (isNaN(count) || count < 0 || count > 3) return err('Strikes müssen zwischen 0 und 3 liegen', 400, o);

    const result = await env.DATABASE
      .prepare('INSERT INTO division_strikes (division_id, member_name, count, kind, expires_at, added_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(division.id, memberName, count, kind, expiresAt, actor.robloxId)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_STRIKE_ADD', 'division_strikes', String(result.meta.last_row_id), { slug: division.slug, memberName, count, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── PATCH /api/divisions/:slug/strikes/:id ───────────────────────────────────
  static async updateStrike(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_STRIKES'))) return err('Zugriff verweigert', 403, o);

    const strikeId = parseInt(params.id);
    if (isNaN(strikeId)) return err('Ungültige Strike-ID', 400, o);
    const existing = await env.DATABASE.prepare('SELECT * FROM division_strikes WHERE id = ? AND division_id = ?').bind(strikeId, division.id).first<DivisionStrikeRow>();
    if (!existing) return err('Strike nicht gefunden', 404, o);

    const body: any = await request.json().catch(() => ({}));
    const count = body.count !== undefined ? Number(body.count) : existing.count;
    const expiresAt = body.expiresAt !== undefined ? (body.expiresAt ? String(body.expiresAt) : null) : existing.expires_at;

    if (isNaN(count) || count < 0 || count > 3) return err('Strikes müssen zwischen 0 und 3 liegen', 400, o);

    await env.DATABASE.prepare('UPDATE division_strikes SET count = ?, expires_at = ? WHERE id = ?').bind(count, expiresAt, strikeId).run();
    await auditLog(env.DATABASE, null, 'DIVISION_STRIKE_UPDATE', 'division_strikes', String(strikeId), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/strikes/:id ──────────────────────────────────
  static async removeStrike(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.hasPermission(env, actor, division.id, 'MANAGE_STRIKES'))) return err('Zugriff verweigert', 403, o);

    const strikeId = parseInt(params.id);
    if (isNaN(strikeId)) return err('Ungültige Strike-ID', 400, o);

    await env.DATABASE.prepare('DELETE FROM division_strikes WHERE id = ? AND division_id = ?').bind(strikeId, division.id).run();
    await auditLog(env.DATABASE, null, 'DIVISION_STRIKE_REMOVE', 'division_strikes', String(strikeId), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ══════════════════════════════ Abmeldungen (signoffs) ═════════════════════

  // ─── GET /api/divisions/:slug/signoffs ────────────────────────────────────────
  static async listSignoffs(_req: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canAccess(env, actor, division.id))) return err('Zugriff verweigert', 403, o);

    const now = new Date().toISOString().slice(0, 10);
    // Drop Abmeldungen whose end date has passed.
    await env.DATABASE.prepare(`DELETE FROM division_signoffs WHERE division_id = ? AND to_date IS NOT NULL AND to_date < ?`).bind(division.id, now).run();

    const rows = await env.DATABASE.prepare('SELECT * FROM division_signoffs WHERE division_id = ? ORDER BY from_date ASC').bind(division.id).all<DivisionSignoffRow>();
    return json({ signoffs: rows.results }, 200, o);
  }

  // ─── POST /api/divisions/:slug/signoffs ───────────────────────────────────────
  // Always attributed to the caller themselves — not a free-text name — so it
  // can't be used to submit an Abmeldung impersonating someone else.
  static async addSignoff(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canAccess(env, actor, division.id))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const fromDate = String(body.fromDate ?? '').trim();
    const toDate   = body.toDate ? String(body.toDate).trim() : null;
    const reason   = String(body.reason ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return err('Ungültiges Startdatum', 400, o);
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return err('Ungültiges Enddatum', 400, o);
    if (reason.length < 2 || reason.length > 300) return err('Grund muss zwischen 2 und 300 Zeichen haben', 400, o);

    const result = await env.DATABASE
      .prepare('INSERT INTO division_signoffs (division_id, roblox_id, username, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(division.id, actor.robloxId, actor.username, fromDate, toDate, reason)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_SIGNOFF_ADD', 'division_signoffs', String(result.meta.last_row_id), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── DELETE /api/divisions/:slug/signoffs/:id ─────────────────────────────────
  static async removeSignoff(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const signoffId = parseInt(params.id);
    if (isNaN(signoffId)) return err('Ungültige ID', 400, o);
    const existing = await env.DATABASE.prepare('SELECT * FROM division_signoffs WHERE id = ? AND division_id = ?').bind(signoffId, division.id).first<DivisionSignoffRow>();
    if (!existing) return err('Abmeldung nicht gefunden', 404, o);

    const isOwner = existing.roblox_id === actor.robloxId;
    if (!isOwner && !(await DivisionController.hasPermission(env, actor, division.id, 'MODERATE_SIGNOFFS'))) return err('Zugriff verweigert', 403, o);

    await env.DATABASE.prepare('DELETE FROM division_signoffs WHERE id = ?').bind(signoffId).run();
    await auditLog(env.DATABASE, null, 'DIVISION_SIGNOFF_REMOVE', 'division_signoffs', String(signoffId), { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ══════════════════════════════ Unterrollen-Berechtigungen ═════════════════
  // Editing these stays Divisionsleitung/system-admin only (canManage, not
  // hasPermission) — a permission holder must never be able to grant themselves
  // more.

  // ─── GET /api/divisions/:slug/subrole-permissions ─────────────────────────────
  static async getSubrolePermissions(_req: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, actor, division.id))) return err('Zugriff verweigert', 403, o);

    const rows = await env.DATABASE
      .prepare('SELECT sub_role, permissions FROM division_subrole_permissions WHERE division_id = ?')
      .bind(division.id)
      .all<{ sub_role: string; permissions: string }>();

    const permissions: Record<string, string[]> = {};
    for (const row of rows.results) permissions[row.sub_role] = JSON.parse(row.permissions ?? '[]');

    return json({ permissions, available: DIVISION_PERMISSIONS }, 200, o);
  }

  // ─── PATCH /api/divisions/:slug/subrole-permissions/:subRole ─────────────────
  static async updateSubrolePermissions(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, actor, division.id))) return err('Zugriff verweigert', 403, o);

    const subRole = decodeURIComponent(params.subRole);
    const allowedSubRoles: string[] = JSON.parse(division.sub_roles ?? '[]');
    if (!allowedSubRoles.includes(subRole)) return err('Ungültige Unterrolle für diese Division', 400, o);

    const body: any = await request.json().catch(() => ({}));
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    if (permissions.some((p: unknown) => !DIVISION_PERMISSIONS.includes(p as DivisionPermission))) {
      return err('Ungültige Berechtigung', 400, o);
    }

    const permissionsJson = JSON.stringify(permissions);
    await env.DATABASE
      .prepare('INSERT OR IGNORE INTO division_subrole_permissions (division_id, sub_role, permissions) VALUES (?, ?, ?)')
      .bind(division.id, subRole, permissionsJson)
      .run();
    await env.DATABASE
      .prepare('UPDATE division_subrole_permissions SET permissions = ? WHERE division_id = ? AND sub_role = ?')
      .bind(permissionsJson, division.id, subRole)
      .run();

    await auditLog(env.DATABASE, null, 'DIVISION_SUBROLE_PERMISSIONS_UPDATE', 'division_subrole_permissions', `${division.id}:${subRole}`, { slug: division.slug, subRole, permissions, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ══════════════════════════════ Divisionsleitung ═══════════════════════════

  // ─── GET /api/divisions/leads/me ──────────────────────────────────────────────
  static async myLeads(_req: Request, env: Env, actor: DivisionSessionPayload): Promise<Response> {
    const o = DivisionController.origin(env);
    if (isSystemAdminUser(actor)) {
      const all = await env.DATABASE.prepare('SELECT slug FROM divisions').all<{ slug: string }>();
      const slugs = all.results.map(d => d.slug);
      return json({ isSystemAdmin: true, leadOf: slugs, memberOf: slugs, permissions: {} }, 200, o);
    }
    const leadRows = await env.DATABASE
      .prepare('SELECT d.slug FROM division_leads dl JOIN divisions d ON d.id = dl.division_id WHERE dl.roblox_id = ?')
      .bind(actor.robloxId)
      .all<{ slug: string }>();
    const memberRows = await env.DATABASE
      .prepare('SELECT d.id, d.slug, dm.sub_role FROM division_members dm JOIN divisions d ON d.id = dm.division_id WHERE dm.roblox_id = ?')
      .bind(actor.robloxId)
      .all<{ id: number; slug: string; sub_role: string }>();

    // Effective permissions granted via each membership's Unterrolle, keyed by division slug.
    const permissions: Record<string, string[]> = {};
    for (const row of memberRows.results) {
      if (!row.sub_role) continue;
      const perm = await env.DATABASE
        .prepare('SELECT permissions FROM division_subrole_permissions WHERE division_id = ? AND sub_role = ?')
        .bind(row.id, row.sub_role)
        .first<{ permissions: string }>();
      if (perm) permissions[row.slug] = JSON.parse(perm.permissions ?? '[]');
    }

    return json({
      isSystemAdmin: false,
      leadOf: leadRows.results.map(d => d.slug),
      memberOf: memberRows.results.map(d => d.slug),
      permissions,
    }, 200, o);
  }

  // ─── GET /api/divisions/:slug/leads ───────────────────────────────────────────
  static async listLeads(_req: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(actor)) return err('Nur der Systemadministrator kann Divisionsleitungen einsehen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const rows = await env.DATABASE
      .prepare('SELECT roblox_id, username, assigned_at FROM division_leads WHERE division_id = ? ORDER BY assigned_at ASC')
      .bind(division.id)
      .all<{ roblox_id: string; username: string | null; assigned_at: string }>();

    return json({ leads: rows.results }, 200, o);
  }

  // ─── POST /api/divisions/:slug/leads/:identifier ──────────────────────────────
  // identifier can be a Roblox user ID or a Roblox username — resolved the same
  // way as GET /api/roblox/player/:identifier. The target is identified purely by
  // Roblox ID — they need not have ever logged in, and this does not add them to
  // the team panel.
  static async assignLead(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(actor)) return err('Nur der Systemadministrator kann Divisionsleitungen zuweisen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const identifier = params.identifier;
    let robloxId: string;
    let username: string | null = null;

    if (/^\d+$/.test(identifier)) {
      robloxId = identifier;
    } else {
      const result = await resolveUsername(env, identifier);
      if (result.type === 'notFound') return err('Roblox-Nutzer nicht gefunden', 404, o);
      if (result.type === 'apiError') return err(`Roblox-API-Fehler (${result.status}): ${result.message}`, 502, o);
      robloxId = result.userId;
    }

    // Best-effort username lookup, purely for display in the leads list — the
    // assignment still succeeds even if Roblox's API is unreachable.
    try {
      const res = await fetch(`https://users.roblox.com/v1/users/${robloxId}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json() as { name?: string };
        username = data.name ?? null;
      }
    } catch { /* best effort */ }

    await env.DATABASE
      .prepare('INSERT OR IGNORE INTO division_leads (roblox_id, division_id, username, assigned_by) VALUES (?, ?, ?, ?)')
      .bind(robloxId, division.id, username, actor.robloxId)
      .run();
    if (username) {
      await env.DATABASE.prepare('UPDATE division_leads SET username = ? WHERE roblox_id = ? AND division_id = ?').bind(username, robloxId, division.id).run();
    }

    await auditLog(env.DATABASE, null, 'DIVISION_LEAD_ASSIGN', 'division_leads', `${robloxId}:${division.id}`, { slug: division.slug, robloxId, username, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true, username }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/leads/:robloxId ──────────────────────────────
  static async removeLead(request: Request, env: Env, actor: DivisionSessionPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(actor)) return err('Nur der Systemadministrator kann Divisionsleitungen entfernen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const robloxId = params.robloxId;

    await env.DATABASE.prepare('DELETE FROM division_leads WHERE roblox_id = ? AND division_id = ?').bind(robloxId, division.id).run();
    await auditLog(env.DATABASE, null, 'DIVISION_LEAD_REMOVE', 'division_leads', `${robloxId}:${division.id}`, { slug: division.slug, actorRobloxId: actor.robloxId }, getIP(request));
    return json({ success: true }, 200, o);
  }
}

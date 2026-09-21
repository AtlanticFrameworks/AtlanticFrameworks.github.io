import type { Env, JWTPayload, DivisionRow, DivisionMemberRow, DivisionStrikeRow } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';

// The division system administrator is hardcoded to this one Roblox account (username,
// not display name/nickname) — intentionally independent of the general staff rank
// ladder (OWNER etc.), per explicit request. Compared case-insensitively since Roblox
// usernames are case-insensitive at login.
const SYSTEM_ADMIN_ROBLOX_USERNAME = 'thatzanex';

function isSystemAdminUser(user: JWTPayload): boolean {
  return user.username?.toLowerCase() === SYSTEM_ADMIN_ROBLOX_USERNAME;
}

/**
 * DivisionController – /division page backend.
 *
 * Route summary:
 *   GET    /api/divisions                        → list all divisions (public)
 *   GET    /api/divisions/:slug                   → division detail + roster (public)
 *   PATCH  /api/divisions/:slug                   → update color/description/sub_roles (system admin or lead) — icon is fixed
 *   POST   /api/divisions/:slug/members           → add roster member (system admin or lead)
 *   PATCH  /api/divisions/:slug/members/:id       → edit roster member (system admin or lead)
 *   DELETE /api/divisions/:slug/members/:id       → remove roster member (system admin or lead)
 *   GET    /api/divisions/:slug/strikes           → list strikes (system admin or lead)
 *   POST   /api/divisions/:slug/strikes           → add strike (system admin or lead)
 *   PATCH  /api/divisions/:slug/strikes/:id       → edit strike (system admin or lead)
 *   DELETE /api/divisions/:slug/strikes/:id       → remove strike (system admin or lead)
 *   GET    /api/divisions/leads/me                → divisions the caller leads
 *   GET    /api/divisions/:slug/leads             → list Divisionsleitung for a division (system admin only)
 *   POST   /api/divisions/:slug/leads/:robloxId   → assign Divisionsleitung by Roblox user ID (system admin only) —
 *                                                    the target need not have a `users` row / be staff
 *   DELETE /api/divisions/:slug/leads/:robloxId   → remove Divisionsleitung (system admin only)
 */
export class DivisionController {

  private static origin(env: Env) { return env.ALLOWED_ORIGIN ?? 'https://bwrp.net'; }

  private static async getDivisionBySlug(env: Env, slug: string): Promise<DivisionRow | null> {
    return env.DATABASE.prepare('SELECT * FROM divisions WHERE slug = ?').bind(slug).first<DivisionRow>();
  }

  /** The system admin manages every division; a Divisionsleitung only their own. */
  private static async canManage(env: Env, user: JWTPayload, divisionId: number): Promise<boolean> {
    if (isSystemAdminUser(user)) return true;
    const lead = await env.DATABASE
      .prepare('SELECT 1 FROM division_leads WHERE roblox_id = ? AND division_id = ?')
      .bind(user.robloxId, divisionId)
      .first();
    return !!lead;
  }

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
  static async update(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

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

    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_UPDATE', 'divisions', String(division.id), { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── POST /api/divisions/:slug/members ────────────────────────────────────────
  static async addMember(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const username = String(body.username ?? '').trim();
    const robloxId = body.robloxId ? String(body.robloxId).trim() : null;
    const subRole  = body.subRole ? String(body.subRole).trim() : '';
    const joinedAt = body.joinedAt ? String(body.joinedAt) : null;

    if (username.length < 2) return err('Name muss mindestens 2 Zeichen haben', 400, o);
    const allowedSubRoles: string[] = JSON.parse(division.sub_roles ?? '[]');
    if (subRole && !allowedSubRoles.includes(subRole)) return err('Ungültige Unterrolle für diese Division', 400, o);

    const result = await env.DATABASE
      .prepare('INSERT INTO division_members (division_id, roblox_id, username, sub_role, joined_at, added_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(division.id, robloxId, username, subRole, joinedAt, Number(user.sub))
      .run();

    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_MEMBER_ADD', 'division_members', String(result.meta.last_row_id), { slug: division.slug, username }, getIP(request));
    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── PATCH /api/divisions/:slug/members/:id ───────────────────────────────────
  static async updateMember(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

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
    const allowedSubRoles: string[] = JSON.parse(division.sub_roles ?? '[]');
    if (subRole && !allowedSubRoles.includes(subRole)) return err('Ungültige Unterrolle für diese Division', 400, o);

    await env.DATABASE
      .prepare('UPDATE division_members SET username = ?, roblox_id = ?, sub_role = ?, joined_at = ? WHERE id = ?')
      .bind(username, robloxId, subRole, joinedAt, memberId)
      .run();

    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_MEMBER_UPDATE', 'division_members', String(memberId), { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/members/:id ──────────────────────────────────
  static async removeMember(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const memberId = parseInt(params.id);
    if (isNaN(memberId)) return err('Ungültige Mitglieds-ID', 400, o);

    await env.DATABASE.prepare('DELETE FROM division_members WHERE id = ? AND division_id = ?').bind(memberId, division.id).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_MEMBER_REMOVE', 'division_members', String(memberId), { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── GET /api/divisions/:slug/strikes ─────────────────────────────────────────
  static async listStrikes(_req: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const now = new Date().toISOString();
    // Drop expired temp strikes, mirroring the mockup's auto-cleanup behaviour.
    await env.DATABASE.prepare(`DELETE FROM division_strikes WHERE division_id = ? AND kind = 'temp' AND expires_at IS NOT NULL AND expires_at <= ?`).bind(division.id, now).run();

    const rows = await env.DATABASE.prepare('SELECT * FROM division_strikes WHERE division_id = ? ORDER BY created_at DESC').bind(division.id).all<DivisionStrikeRow>();
    return json({ strikes: rows.results }, 200, o);
  }

  // ─── POST /api/divisions/:slug/strikes ────────────────────────────────────────
  static async addStrike(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const memberName = String(body.memberName ?? '').trim();
    const count = Number(body.count);
    const kind = body.kind === 'temp' ? 'temp' : 'perm';
    const expiresAt = kind === 'temp' && body.expiresAt ? String(body.expiresAt) : null;

    if (memberName.length < 2) return err('Name muss mindestens 2 Zeichen haben', 400, o);
    if (isNaN(count) || count < 0 || count > 3) return err('Strikes müssen zwischen 0 und 3 liegen', 400, o);

    const result = await env.DATABASE
      .prepare('INSERT INTO division_strikes (division_id, member_name, count, kind, expires_at, added_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(division.id, memberName, count, kind, expiresAt, Number(user.sub))
      .run();

    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_STRIKE_ADD', 'division_strikes', String(result.meta.last_row_id), { slug: division.slug, memberName, count }, getIP(request));
    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── PATCH /api/divisions/:slug/strikes/:id ───────────────────────────────────
  static async updateStrike(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const strikeId = parseInt(params.id);
    if (isNaN(strikeId)) return err('Ungültige Strike-ID', 400, o);
    const existing = await env.DATABASE.prepare('SELECT * FROM division_strikes WHERE id = ? AND division_id = ?').bind(strikeId, division.id).first<DivisionStrikeRow>();
    if (!existing) return err('Strike nicht gefunden', 404, o);

    const body: any = await request.json().catch(() => ({}));
    const count = body.count !== undefined ? Number(body.count) : existing.count;
    const expiresAt = body.expiresAt !== undefined ? (body.expiresAt ? String(body.expiresAt) : null) : existing.expires_at;

    if (isNaN(count) || count < 0 || count > 3) return err('Strikes müssen zwischen 0 und 3 liegen', 400, o);

    await env.DATABASE.prepare('UPDATE division_strikes SET count = ?, expires_at = ? WHERE id = ?').bind(count, expiresAt, strikeId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_STRIKE_UPDATE', 'division_strikes', String(strikeId), { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/strikes/:id ──────────────────────────────────
  static async removeStrike(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);
    if (!(await DivisionController.canManage(env, user, division.id))) return err('Zugriff verweigert', 403, o);

    const strikeId = parseInt(params.id);
    if (isNaN(strikeId)) return err('Ungültige Strike-ID', 400, o);

    await env.DATABASE.prepare('DELETE FROM division_strikes WHERE id = ? AND division_id = ?').bind(strikeId, division.id).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_STRIKE_REMOVE', 'division_strikes', String(strikeId), { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }

  // ─── GET /api/divisions/leads/me ──────────────────────────────────────────────
  static async myLeads(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DivisionController.origin(env);
    if (isSystemAdminUser(user)) {
      const all = await env.DATABASE.prepare('SELECT slug FROM divisions').all<{ slug: string }>();
      return json({ isSystemAdmin: true, divisions: all.results.map(d => d.slug) }, 200, o);
    }
    const rows = await env.DATABASE
      .prepare('SELECT d.slug FROM division_leads dl JOIN divisions d ON d.id = dl.division_id WHERE dl.roblox_id = ?')
      .bind(user.robloxId)
      .all<{ slug: string }>();
    return json({ isSystemAdmin: false, divisions: rows.results.map(d => d.slug) }, 200, o);
  }

  // ─── GET /api/divisions/:slug/leads ───────────────────────────────────────────
  static async listLeads(_req: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(user)) return err('Nur der Systemadministrator kann Divisionsleitungen einsehen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const rows = await env.DATABASE
      .prepare('SELECT roblox_id, username, assigned_at FROM division_leads WHERE division_id = ? ORDER BY assigned_at ASC')
      .bind(division.id)
      .all<{ roblox_id: string; username: string | null; assigned_at: string }>();

    return json({ leads: rows.results }, 200, o);
  }

  // ─── POST /api/divisions/:slug/leads/:robloxId ────────────────────────────────
  // The target is identified purely by Roblox user ID — they need not have ever
  // logged in / have a `users` row, and this does not add them to the team panel.
  static async assignLead(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(user)) return err('Nur der Systemadministrator kann Divisionsleitungen zuweisen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const robloxId = params.robloxId;
    if (!/^\d+$/.test(robloxId)) return err('Ungültige Roblox User-ID', 400, o);

    // Best-effort username lookup, purely for display in the leads list — the
    // assignment still succeeds even if Roblox's API is unreachable.
    let username: string | null = null;
    try {
      const res = await fetch(`https://users.roblox.com/v1/users/${robloxId}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json() as { name?: string };
        username = data.name ?? null;
      }
    } catch { /* best effort */ }

    await env.DATABASE
      .prepare('INSERT OR IGNORE INTO division_leads (roblox_id, division_id, username, assigned_by) VALUES (?, ?, ?, ?)')
      .bind(robloxId, division.id, username, Number(user.sub))
      .run();
    if (username) {
      await env.DATABASE.prepare('UPDATE division_leads SET username = ? WHERE roblox_id = ? AND division_id = ?').bind(username, robloxId, division.id).run();
    }

    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_LEAD_ASSIGN', 'division_leads', `${robloxId}:${division.id}`, { slug: division.slug, robloxId, username }, getIP(request));
    return json({ success: true, username }, 200, o);
  }

  // ─── DELETE /api/divisions/:slug/leads/:robloxId ──────────────────────────────
  static async removeLead(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DivisionController.origin(env);
    if (!isSystemAdminUser(user)) return err('Nur der Systemadministrator kann Divisionsleitungen entfernen', 403, o);

    const division = await DivisionController.getDivisionBySlug(env, params.slug);
    if (!division) return err('Division nicht gefunden', 404, o);

    const robloxId = params.robloxId;

    await env.DATABASE.prepare('DELETE FROM division_leads WHERE roblox_id = ? AND division_id = ?').bind(robloxId, division.id).run();
    await auditLog(env.DATABASE, Number(user.sub), 'DIVISION_LEAD_REMOVE', 'division_leads', `${robloxId}:${division.id}`, { slug: division.slug }, getIP(request));
    return json({ success: true }, 200, o);
  }
}

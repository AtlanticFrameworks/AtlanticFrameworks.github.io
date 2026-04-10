import type { Env, JWTPayload, RoleRow } from '../types/index.js';
import { ALL_PERMISSIONS } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';

/**
 * RolesController – Dynamic RBAC role management.
 *
 * Route summary:
 *   GET    /api/roles                          → list all custom roles (ADMIN+)
 *   POST   /api/roles                          → create role (OWNER)
 *   PATCH  /api/roles/:id                      → update role (OWNER)
 *   DELETE /api/roles/:id                      → delete role (OWNER)
 *   GET    /api/roles/permissions              → list available permissions (ADMIN+)
 *   GET    /api/roles/users/:userId            → get roles assigned to a user (ADMIN+)
 *   POST   /api/roles/users/:userId/assign     → assign role to user (ADMIN+)
 *   DELETE /api/roles/users/:userId/:roleId    → remove role from user (ADMIN+)
 */
export class RolesController {

  private static origin(env: Env) { return env.ALLOWED_ORIGIN ?? 'https://bwrp.net'; }

  // ─── GET /api/roles/permissions ──────────────────────────────────────────────
  static async listPermissions(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Zugriff verweigert', 403, o);
    return json({ permissions: ALL_PERMISSIONS }, 200, o);
  }

  // ─── GET /api/roles ───────────────────────────────────────────────────────────
  static async listRoles(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Zugriff verweigert', 403, o);

    const rows = await env.DATABASE.prepare(
      'SELECT * FROM roles ORDER BY hierarchy DESC, name ASC'
    ).all<RoleRow>();

    const roles = rows.results.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions ?? '[]'),
    }));

    return json({ roles }, 200, o);
  }

  // ─── POST /api/roles ──────────────────────────────────────────────────────────
  static async createRole(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['OWNER']) return err('Nur OWNER kann Rollen erstellen', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const { name, color = '#71717a', hierarchy = 0, permissions = [] } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return err('Rollenname muss mindestens 2 Zeichen haben', 400, o);
    }
    if (typeof hierarchy !== 'number' || hierarchy < 0 || hierarchy > 1000) {
      return err('Hierarchie muss eine Zahl zwischen 0 und 1000 sein', 400, o);
    }
    if (!Array.isArray(permissions) || permissions.some(p => !ALL_PERMISSIONS.includes(p))) {
      return err('Ungültige Berechtigungen', 400, o);
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return err('Ungültige Farbe (erwartet #RRGGBB)', 400, o);
    }

    const existing = await env.DATABASE.prepare('SELECT id FROM roles WHERE name = ?').bind(name.trim()).first();
    if (existing) return err(`Rolle "${name}" existiert bereits`, 409, o);

    const result = await env.DATABASE.prepare(
      'INSERT INTO roles (name, color, hierarchy, permissions) VALUES (?, ?, ?, ?)'
    ).bind(name.trim(), color, hierarchy, JSON.stringify(permissions)).run();

    await auditLog(env.DATABASE, Number(user.sub), 'ROLE_CREATE', 'roles', String(result.meta.last_row_id), { name: name.trim(), hierarchy }, getIP(request));

    return json({ success: true, id: result.meta.last_row_id }, 201, o);
  }

  // ─── PATCH /api/roles/:id ─────────────────────────────────────────────────────
  static async updateRole(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['OWNER']) return err('Nur OWNER kann Rollen bearbeiten', 403, o);

    const roleId = parseInt(params.id);
    if (isNaN(roleId) || roleId <= 0) return err('Ungültige Rollen-ID', 400, o);

    const existing = await env.DATABASE.prepare('SELECT * FROM roles WHERE id = ?').bind(roleId).first<RoleRow>();
    if (!existing) return err('Rolle nicht gefunden', 404, o);

    const body: any = await request.json().catch(() => ({}));
    const name        = body.name        !== undefined ? String(body.name).trim()    : existing.name;
    const color       = body.color       !== undefined ? String(body.color)          : existing.color;
    const hierarchy   = body.hierarchy   !== undefined ? Number(body.hierarchy)      : existing.hierarchy;
    const permissions = body.permissions !== undefined ? body.permissions            : JSON.parse(existing.permissions ?? '[]');

    if (name.length < 2) return err('Rollenname muss mindestens 2 Zeichen haben', 400, o);
    if (isNaN(hierarchy) || hierarchy < 0 || hierarchy > 1000) return err('Hierarchie muss zwischen 0 und 1000 liegen', 400, o);
    if (!Array.isArray(permissions) || permissions.some((p: string) => !ALL_PERMISSIONS.includes(p as any))) return err('Ungültige Berechtigungen', 400, o);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return err('Ungültige Farbe (erwartet #RRGGBB)', 400, o);

    // Check name uniqueness if changed
    if (name !== existing.name) {
      const conflict = await env.DATABASE.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').bind(name, roleId).first();
      if (conflict) return err(`Rolle "${name}" existiert bereits`, 409, o);
    }

    await env.DATABASE.prepare(
      'UPDATE roles SET name = ?, color = ?, hierarchy = ?, permissions = ? WHERE id = ?'
    ).bind(name, color, hierarchy, JSON.stringify(permissions), roleId).run();

    await auditLog(env.DATABASE, Number(user.sub), 'ROLE_UPDATE', 'roles', String(roleId), { name, hierarchy }, getIP(request));

    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/roles/:id ────────────────────────────────────────────────────
  static async deleteRole(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['OWNER']) return err('Nur OWNER kann Rollen löschen', 403, o);

    const roleId = parseInt(params.id);
    if (isNaN(roleId) || roleId <= 0) return err('Ungültige Rollen-ID', 400, o);

    const existing = await env.DATABASE.prepare('SELECT name FROM roles WHERE id = ?').bind(roleId).first<{ name: string }>();
    if (!existing) return err('Rolle nicht gefunden', 404, o);

    // Cascade delete handled by FK on user_roles
    await env.DATABASE.prepare('DELETE FROM roles WHERE id = ?').bind(roleId).run();
    await auditLog(env.DATABASE, Number(user.sub), 'ROLE_DELETE', 'roles', String(roleId), { name: existing.name }, getIP(request));

    return json({ success: true }, 200, o);
  }

  // ─── GET /api/roles/users/:userId ────────────────────────────────────────────
  static async getUserRoles(_req: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Zugriff verweigert', 403, o);

    const userId = parseInt(params.userId);
    if (isNaN(userId) || userId <= 0) return err('Ungültige User-ID', 400, o);

    const rows = await env.DATABASE.prepare(`
      SELECT r.id, r.name, r.color, r.hierarchy, r.permissions, ur.assigned_at, ur.assigned_by
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.hierarchy DESC
    `).bind(userId).all<any>();

    const roles = rows.results.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions ?? '[]'),
    }));

    return json({ roles }, 200, o);
  }

  // ─── POST /api/roles/users/:userId/assign ────────────────────────────────────
  static async assignRole(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Zugriff verweigert', 403, o);

    const userId = parseInt(params.userId);
    if (isNaN(userId) || userId <= 0) return err('Ungültige User-ID', 400, o);

    const body: any = await request.json().catch(() => ({}));
    const roleId = parseInt(body.roleId);
    if (isNaN(roleId) || roleId <= 0) return err('Ungültige Rollen-ID', 400, o);

    const targetUser = await env.DATABASE.prepare('SELECT id, username FROM users WHERE id = ?').bind(userId).first<{ id: number; username: string }>();
    if (!targetUser) return err('User nicht gefunden', 404, o);

    const role = await env.DATABASE.prepare('SELECT id, name FROM roles WHERE id = ?').bind(roleId).first<{ id: number; name: string }>();
    if (!role) return err('Rolle nicht gefunden', 404, o);

    // Upsert — ignore if already assigned
    await env.DATABASE.prepare(
      'INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)'
    ).bind(userId, roleId, Number(user.sub)).run();

    await auditLog(env.DATABASE, Number(user.sub), 'ROLE_ASSIGN', 'user_roles', `${userId}:${roleId}`, { username: targetUser.username, roleName: role.name }, getIP(request));

    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/roles/users/:userId/:roleId ─────────────────────────────────
  static async removeRole(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = RolesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['ADMIN']) return err('Zugriff verweigert', 403, o);

    const userId = parseInt(params.userId);
    const roleId = parseInt(params.roleId);
    if (isNaN(userId) || isNaN(roleId)) return err('Ungültige ID', 400, o);

    await env.DATABASE.prepare(
      'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?'
    ).bind(userId, roleId).run();

    await auditLog(env.DATABASE, Number(user.sub), 'ROLE_REMOVE', 'user_roles', `${userId}:${roleId}`, {}, getIP(request));

    return json({ success: true }, 200, o);
  }
}

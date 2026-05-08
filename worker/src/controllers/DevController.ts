import type { Env, JWTPayload, DevTaskRow, DevServerLogRow, DevPortalUserRow } from '../types/index.js';
import { json, err } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';

/**
 * DevController – Developer Portal for BWRP Staff.
 *
 * Route summary:
 *   GET    /api/dev/tasks        → list all tasks (TRAINEE+)
 *   POST   /api/dev/tasks        → create task (MOD+)
 *   PATCH  /api/dev/tasks/:id    → update task (TRAINEE+)
 *   DELETE /api/dev/tasks/:id    → delete task (MOD+)
 *   GET    /api/dev/logs         → list server logs (TRAINEE+)
 *   POST   /api/dev/logs         → create server log (MOD+)
 */
export class DevController {

  private static origin(env: Env) { return env.ALLOWED_ORIGIN ?? 'https://bwrp.net'; }

  // ─── GET /api/dev/tasks ───────────────────────────────────────────────────────
  static async listTasks(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['TRAINEE']) return err('Keine Berechtigung', 403, o);

    const result = await env.DATABASE.prepare(
      'SELECT * FROM dev_tasks ORDER BY created_at DESC'
    ).all<DevTaskRow>();

    return json({ tasks: result.results ?? [] }, 200, o);
  }

  // ─── POST /api/dev/tasks ──────────────────────────────────────────────────────
  static async createTask(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung – MOD+ erforderlich', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const { title, description = '', priority = 'medium', assigned_to = '' } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return err('title ist ein Pflichtfeld', 400, o);
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) return err('Ungültige Priorität', 400, o);

    const result = await env.DATABASE.prepare(
      `INSERT INTO dev_tasks (title, description, status, priority, created_by_id, created_by_username, assigned_to)
       VALUES (?, ?, 'todo', ?, ?, ?, ?)
       RETURNING *`
    ).bind(title.trim(), description, priority, Number(user.sub), user.username, assigned_to).first<DevTaskRow>();

    return json({ task: result }, 201, o);
  }

  // ─── PATCH /api/dev/tasks/:id ─────────────────────────────────────────────────
  static async updateTask(request: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['TRAINEE']) return err('Keine Berechtigung', 403, o);

    const id = Number(params.id);
    if (isNaN(id)) return err('Ungültige Task-ID', 400, o);

    const existing = await env.DATABASE.prepare(
      'SELECT * FROM dev_tasks WHERE id = ?'
    ).bind(id).first<DevTaskRow>();
    if (!existing) return err('Task nicht gefunden', 404, o);

    const body: any = await request.json().catch(() => ({}));
    const validStatuses  = ['todo', 'inprogress', 'done'];
    const validPriorities = ['low', 'medium', 'high'];

    const title       = typeof body.title       === 'string' ? body.title.trim()       : existing.title;
    const description = typeof body.description === 'string' ? body.description        : existing.description;
    const status      = validStatuses.includes(body.status)  ? body.status             : existing.status;
    const priority    = validPriorities.includes(body.priority) ? body.priority        : existing.priority;
    const assigned_to = typeof body.assigned_to === 'string' ? body.assigned_to.trim() : existing.assigned_to;

    await env.DATABASE.prepare(
      `UPDATE dev_tasks
       SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(title, description, status, priority, assigned_to, id).run();

    return json({ success: true }, 200, o);
  }

  // ─── DELETE /api/dev/tasks/:id ────────────────────────────────────────────────
  static async deleteTask(_req: Request, env: Env, user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung – MOD+ erforderlich', 403, o);

    const id = Number(params.id);
    if (isNaN(id)) return err('Ungültige Task-ID', 400, o);

    const existing = await env.DATABASE.prepare(
      'SELECT id FROM dev_tasks WHERE id = ?'
    ).bind(id).first<{ id: number }>();
    if (!existing) return err('Task nicht gefunden', 404, o);

    await env.DATABASE.prepare('DELETE FROM dev_tasks WHERE id = ?').bind(id).run();
    return json({ success: true }, 200, o);
  }

  // ─── GET /api/dev/logs ────────────────────────────────────────────────────────
  static async listLogs(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['TRAINEE']) return err('Keine Berechtigung', 403, o);

    const result = await env.DATABASE.prepare(
      'SELECT * FROM dev_server_logs ORDER BY created_at DESC LIMIT 100'
    ).all<DevServerLogRow>();

    return json({ logs: result.results ?? [] }, 200, o);
  }

  // ─── POST /api/dev/logs ───────────────────────────────────────────────────────
  static async createLog(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['MOD']) return err('Keine Berechtigung – MOD+ erforderlich', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const { action, status = 'COMPLETED', notes = '' } = body;

    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      return err('action ist ein Pflichtfeld', 400, o);
    }

    const result = await env.DATABASE.prepare(
      `INSERT INTO dev_server_logs (action, developer_name, developer_id, status, notes)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(action.trim(), user.username, Number(user.sub), status, notes).first<DevServerLogRow>();

    return json({ log: result }, 201, o);
  }

  // ─── GET /api/dev/users ───────────────────────────────────────────────────────
  static async listUsers(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['TRAINEE']) return err('Keine Berechtigung', 403, o);

    const result = await env.DATABASE.prepare(
      'SELECT * FROM dev_portal_users ORDER BY username ASC'
    ).all<DevPortalUserRow>();

    return json({ users: result.results ?? [] }, 200, o);
  }

  // ─── POST /api/dev/users/sync ─────────────────────────────────────────────────
  // Called on every successful login to keep the users table up to date.
  static async syncUser(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = DevController.origin(env);
    const body: any = await request.json().catch(() => ({}));
    const avatar_url = typeof body.avatar_url === 'string' ? body.avatar_url : '';

    await env.DATABASE.prepare(`
      INSERT INTO dev_portal_users (roblox_id, username, avatar_url, first_seen, last_seen)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(roblox_id) DO UPDATE SET
        username   = excluded.username,
        avatar_url = excluded.avatar_url,
        last_seen  = datetime('now')
    `).bind(user.robloxId, user.username, avatar_url).run();

    return json({ success: true }, 200, o);
  }
}

import type { Env, JWTPayload, NoteRow } from '../types/index.js';
import { json, err } from '../middleware/auth.js';
import { ROLE_RANK } from '../types/index.js';

/**
 * NotesController – Personal workspace notes for staff members.
 *
 * Route summary:
 *   GET  /api/notes        → get current user's note (creates empty if none)
 *   PUT  /api/notes        → save / update note content
 *   POST /api/notes/pin    → pin a ticket reference to the note
 *   POST /api/notes/unpin  → remove a pinned ticket by incident_id
 */
export class NotesController {

  private static origin(env: Env) { return env.ALLOWED_ORIGIN ?? 'https://bwrp.net'; }

  /** Ensure a note row exists for this user and return it. */
  private static async getOrCreate(env: Env, userId: number): Promise<NoteRow> {
    const existing = await env.DATABASE.prepare(
      'SELECT * FROM notes WHERE user_id = ?'
    ).bind(userId).first<NoteRow>();

    if (existing) return existing;

    await env.DATABASE.prepare(
      'INSERT INTO notes (user_id, content, pinned_tickets) VALUES (?, ?, ?)'
    ).bind(userId, '', '[]').run();

    return { id: 0, user_id: userId, content: '', pinned_tickets: '[]', updated_at: new Date().toISOString() };
  }

  // ─── GET /api/notes ───────────────────────────────────────────────────────────
  static async getNote(_req: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = NotesController.origin(env);
    const note = await NotesController.getOrCreate(env, Number(user.sub));
    return json({
      content:        note.content,
      pinnedTickets:  JSON.parse(note.pinned_tickets ?? '[]'),
      updatedAt:      note.updated_at,
    }, 200, o);
  }

  // ─── PUT /api/notes ───────────────────────────────────────────────────────────
  static async saveNote(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = NotesController.origin(env);
    const body: any = await request.json().catch(() => ({}));

    if (typeof body.content !== 'string') return err('content muss ein String sein', 400, o);
    if (body.content.length > 10_000) return err('Notiz darf maximal 10.000 Zeichen haben', 400, o);

    const userId = Number(user.sub);
    const note = await NotesController.getOrCreate(env, userId);

    await env.DATABASE.prepare(
      'UPDATE notes SET content = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).bind(body.content, userId).run();

    return json({
      success:       true,
      pinnedTickets: JSON.parse(note.pinned_tickets ?? '[]'),
    }, 200, o);
  }

  // ─── POST /api/notes/pin ──────────────────────────────────────────────────────
  /**
   * Body: { caseId, incidentId, type, targetUsername, createdAt }
   * Appends a ticket reference to the user's pinned_tickets list (max 50).
   */
  static async pinTicket(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = NotesController.origin(env);
    if (ROLE_RANK[user.role] < ROLE_RANK['TRAINEE']) return err('Keine Berechtigung', 403, o);

    const body: any = await request.json().catch(() => ({}));
    const { caseId, incidentId, type, targetUsername, createdAt } = body;
    if (!incidentId || !type || !targetUsername) return err('incidentId, type und targetUsername sind Pflichtfelder', 400, o);

    const userId = Number(user.sub);
    const note = await NotesController.getOrCreate(env, userId);
    const pins: any[] = JSON.parse(note.pinned_tickets ?? '[]');

    // Deduplicate by incidentId
    if (pins.some((p: any) => p.incidentId === incidentId)) {
      return json({ success: true, message: 'Bereits angepinnt', pinnedTickets: pins }, 200, o);
    }

    if (pins.length >= 50) return err('Maximal 50 angepinnte Tickets erlaubt', 400, o);

    pins.unshift({ caseId, incidentId, type, targetUsername, createdAt: createdAt ?? new Date().toISOString() });

    await env.DATABASE.prepare(
      'UPDATE notes SET pinned_tickets = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).bind(JSON.stringify(pins), userId).run();

    return json({ success: true, pinnedTickets: pins }, 200, o);
  }

  // ─── POST /api/notes/unpin ────────────────────────────────────────────────────
  static async unpinTicket(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const o = NotesController.origin(env);
    const body: any = await request.json().catch(() => ({}));
    const { incidentId } = body;
    if (!incidentId) return err('incidentId ist ein Pflichtfeld', 400, o);

    const userId = Number(user.sub);
    const note = await NotesController.getOrCreate(env, userId);
    const pins: any[] = JSON.parse(note.pinned_tickets ?? '[]').filter((p: any) => p.incidentId !== incidentId);

    await env.DATABASE.prepare(
      'UPDATE notes SET pinned_tickets = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).bind(JSON.stringify(pins), userId).run();

    return json({ success: true, pinnedTickets: pins }, 200, o);
  }
}

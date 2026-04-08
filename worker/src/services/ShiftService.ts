import type { Env, ShiftRow, UserRow } from '../types/index.js';
import { DiscordService } from './DiscordService.js';

export class ShiftService {
  private discord: DiscordService;

  constructor(private env: Env) {
    this.discord = new DiscordService(env);
  }

  // ── Start Shift ───────────────────────────────────────────────────────────

  async startShift(userId: number): Promise<ShiftRow> {
    // End any existing active shift first
    const existing = await this.env.DATABASE
      .prepare('SELECT id FROM shifts WHERE user_id = ? AND status = \'ACTIVE\'')
      .bind(userId)
      .first<{ id: number }>();

    if (existing) {
      await this.endShift(userId, { cases_count: 0, bans_count: 0, warns_count: 0, kicks_count: 0, notes: null });
    }

    await this.env.DATABASE
      .prepare(`INSERT INTO shifts (user_id, start_time, status) VALUES (?, datetime('now'), 'ACTIVE')`)
      .bind(userId)
      .run();

    const shift = await this.env.DATABASE
      .prepare('SELECT * FROM shifts WHERE user_id = ? AND status = \'ACTIVE\' ORDER BY id DESC LIMIT 1')
      .bind(userId)
      .first<ShiftRow>();

    if (!shift) throw new Error('Schicht konnte nicht gestartet werden');
    return shift;
  }

  // ── End Shift ─────────────────────────────────────────────────────────────

  async endShift(userId: number, metrics: {
    cases_count: number;
    bans_count:  number;
    warns_count: number;
    kicks_count: number;
    notes:       string | null;
  }): Promise<ShiftRow> {
    const active = await this.env.DATABASE
      .prepare('SELECT * FROM shifts WHERE user_id = ? AND status = \'ACTIVE\' ORDER BY id DESC LIMIT 1')
      .bind(userId)
      .first<ShiftRow>();

    if (!active) throw new Error('Keine aktive Schicht gefunden');

    const startMs  = new Date(active.start_time).getTime();
    const endMs    = Date.now();
    const duration = Math.floor((endMs - startMs) / 1000);

    await this.env.DATABASE
      .prepare(`UPDATE shifts SET
        end_time         = datetime('now'),
        duration_seconds = ?,
        cases_count      = ?,
        bans_count       = ?,
        warns_count      = ?,
        kicks_count      = ?,
        notes            = ?,
        status           = 'ENDED'
        WHERE id = ?`)
      .bind(
        duration,
        metrics.cases_count,
        metrics.bans_count,
        metrics.warns_count,
        metrics.kicks_count,
        metrics.notes,
        active.id,
      )
      .run();

    const completed = await this.env.DATABASE
      .prepare('SELECT * FROM shifts WHERE id = ?')
      .bind(active.id)
      .first<ShiftRow>();

    if (!completed) throw new Error('Schicht-Update fehlgeschlagen');

    // Get user info for the Discord embed
    const user = await this.env.DATABASE
      .prepare('SELECT username FROM users WHERE id = ?')
      .bind(userId)
      .first<{ username: string }>();

    await this.discord.sendShiftEmbed(completed, user?.username ?? 'Unbekannt').catch(console.warn);

    return completed;
  }

  // ── Get Active Shift ──────────────────────────────────────────────────────

  async getActiveShift(userId: number): Promise<ShiftRow | null> {
    return this.env.DATABASE
      .prepare('SELECT * FROM shifts WHERE user_id = ? AND status = \'ACTIVE\' ORDER BY id DESC LIMIT 1')
      .bind(userId)
      .first<ShiftRow>();
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(): Promise<unknown[]> {
    const { results } = await this.env.DATABASE
      .prepare(`SELECT
          u.username,
          u.role,
          COUNT(s.id)            as total_shifts,
          SUM(s.duration_seconds) as total_seconds,
          SUM(s.cases_count)     as total_cases,
          SUM(s.bans_count)      as total_bans
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'ENDED'
          AND s.end_time >= datetime('now', '-30 days')
        GROUP BY u.id
        ORDER BY total_seconds DESC`)
      .all();
    return results;
  }
}

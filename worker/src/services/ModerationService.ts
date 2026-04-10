import type { Env, CaseRow, CaseType, UserRow } from '../types/index.js';
import { DiscordService } from './DiscordService.js';

export class ModerationService {
  private discord: DiscordService;

  constructor(private env: Env) {
    this.discord = new DiscordService(env);
  }

  // ── Generate Incident ID ──────────────────────────────────────────────────

  private async generateIncidentId(): Promise<string> {
    const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.env.DATABASE
      .prepare('SELECT COUNT(*) as c FROM cases WHERE created_at >= date(\'now\')')
      .first<{ c: number }>();
    const seq = String((count?.c ?? 0) + 1).padStart(3, '0');
    return `CASE-${date}-${seq}`;
  }

  // ── Create Case ───────────────────────────────────────────────────────────

  async createCase(input: {
    targetRobloxId: string;
    targetUsername:  string;
    moderatorId:     number;
    moderatorName:   string;
    type:            CaseType;
    reason:          string;
    evidence?:       string[];
    notes?:          string;
    durationDays?:   number;
  }): Promise<CaseRow> {
    const incidentId = await this.generateIncidentId();

    await this.env.DATABASE
      .prepare(`INSERT INTO cases
        (incident_id, target_roblox_id, target_username, moderator_id, type, reason, evidence, notes, duration_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        incidentId,
        input.targetRobloxId,
        input.targetUsername,
        input.moderatorId,
        input.type,
        input.reason,
        input.evidence ? JSON.stringify(input.evidence) : null,
        input.notes ?? null,
        input.durationDays ?? null,
      )
      .run();

    const newCase = await this.env.DATABASE
      .prepare('SELECT * FROM cases WHERE incident_id = ?')
      .bind(incidentId)
      .first<CaseRow>();

    if (!newCase) throw new Error('Fall konnte nicht angelegt werden');
    
    // ── Security Check: Mass-Banning Detection ──────────────────────────────
    try {
      const windowMinutes = 20;
      const threshold     = 5;
      const recent = await this.env.DATABASE
        .prepare(`SELECT target_username FROM cases 
                  WHERE moderator_id = ? 
                  AND type IN ('BAN', 'PERMBAN') 
                  AND created_at >= datetime('now', '-${windowMinutes} minutes')`)
        .bind(input.moderatorId)
        .all<{ target_username: string }>();

      if (recent.results && recent.results.length >= threshold) {
        const details = recent.results.map(r => `\`${r.target_username}\``).join(', ');
        await this.discord.sendSecurityAlert({
          moderatorName: input.moderatorName,
          moderatorId:   input.moderatorId,
          count:         recent.results.length,
          windowMinutes,
          details:       details.length > 1000 ? details.slice(0, 997) + '...' : details,
        }).catch(console.warn);
      }
    } catch (e) {
      console.error('Mass-ban check failure:', e);
    }

    // Notify Discord (Standard Case Log)
    await this.discord.sendCaseEmbed(newCase, input.moderatorName).catch(console.warn);

    return newCase;
  }

  // ── Get Cases for Player ──────────────────────────────────────────────────

  async getCasesByPlayer(targetRobloxId: string): Promise<CaseRow[]> {
    const { results } = await this.env.DATABASE
      .prepare(`SELECT c.*, u.username as moderator_username
                FROM cases c
                LEFT JOIN users u ON c.moderator_id = u.id
                WHERE c.target_roblox_id = ?
                ORDER BY c.created_at DESC`)
      .bind(targetRobloxId)
      .all<CaseRow>();
    return results;
  }

  // ── Update Case Notes ─────────────────────────────────────────────────────

  async updateCase(caseId: number, patch: { notes?: string; evidence?: string[] }): Promise<void> {
    if (patch.notes !== undefined) {
      await this.env.DATABASE
        .prepare('UPDATE cases SET notes = ? WHERE id = ?')
        .bind(patch.notes, caseId)
        .run();
    }
    if (patch.evidence !== undefined) {
      await this.env.DATABASE
        .prepare('UPDATE cases SET evidence = ? WHERE id = ?')
        .bind(JSON.stringify(patch.evidence), caseId)
        .run();
    }
  }
}

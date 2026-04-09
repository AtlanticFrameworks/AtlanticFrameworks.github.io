import type { Env, CaseRow, ShiftRow } from '../types/index.js';

const TYPE_COLOR: Record<string, number> = {
  WARN:    0xE2A800,
  KICK:    0x3B82F6,
  BAN:     0xEF4444,
  PERMBAN: 0x7F1D1D,
};

const TYPE_EMOJI: Record<string, string> = {
  WARN:    '⚠️',
  KICK:    '👢',
  BAN:     '🔨',
  PERMBAN: '☠️',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export class DiscordService {
  constructor(private env: Env) {}

  private async send(payload: object): Promise<void> {
    if (!this.env.DISCORD_WEBHOOK_URL) return;
    await fetch(this.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // ── Case Embed ────────────────────────────────────────────────────────────

  async sendCaseEmbed(c: CaseRow, moderatorName: string): Promise<void> {
    const evidence: string[] = c.evidence ? JSON.parse(c.evidence) : [];
    await this.send({
      embeds: [{
        title: `${TYPE_EMOJI[c.type] ?? '📋'} Neuer Fall | ${c.incident_id}`,
        color: TYPE_COLOR[c.type] ?? 0x71717A,
        fields: [
          { name: 'Spieler',      value: `\`${c.target_username}\` (ID: ${c.target_roblox_id})`, inline: true },
          { name: 'Moderator',    value: `\`${moderatorName}\``, inline: true },
          { name: 'Maßnahme',     value: `\`${c.type}${c.duration_days ? ` – ${c.duration_days} Tage` : ''}\``, inline: true },
          { name: 'Begründung',   value: c.reason },
          ...(evidence.length ? [{ name: 'Beweise', value: evidence.join('\n') }] : []),
          ...(c.notes ? [{ name: 'Notizen', value: c.notes }] : []),
        ],
        footer: { text: 'BWRP Staff Panel' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // ── Shift End Embed ───────────────────────────────────────────────────────

  async sendShiftEmbed(shift: ShiftRow, username: string): Promise<void> {
    await this.send({
      embeds: [{
        title: '🕐 Schicht beendet',
        color: 0x10B981,
        fields: [
          { name: 'Mitarbeiter', value: `\`${username}\``,                              inline: true },
          { name: 'Dauer',       value: `\`${formatDuration(shift.duration_seconds)}\``, inline: true },
          { name: '_ _',         value: '_ _',                                           inline: true },
          { name: 'Fälle',       value: `\`${shift.cases_count}\``,  inline: true },
          { name: 'Bans',        value: `\`${shift.bans_count}\``,   inline: true },
          { name: 'Verwarnungen',value: `\`${shift.warns_count}\``,  inline: true },
          { name: 'Kicks',       value: `\`${shift.kicks_count}\``,  inline: true },
          ...(shift.notes ? [{ name: 'Notizen', value: shift.notes }] : []),
        ],
        footer:    { text: 'BWRP Staff Panel' },
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // ── Cloud Kick ────────────────────────────────────────────────────────────

  async sendCloudKick(opts: {
    issuedBy: string; targetUsername: string; targetId: string | number; reason: string;
  }): Promise<void> {
    await this.send({ embeds: [{
      title:  '🦵  Player Kicked (Open Cloud)',
      color:  0xF59E0B,
      fields: [
        { name: 'Player',    value: `**${opts.targetUsername}** · \`${opts.targetId}\``, inline: true },
        { name: 'Issued by', value: `\`${opts.issuedBy}\``,  inline: true },
        { name: 'Reason',    value: opts.reason },
      ],
      footer: { text: 'BWRP Game Panel' }, timestamp: new Date().toISOString(),
    }] });
  }

  // ── Cloud Ban ─────────────────────────────────────────────────────────────

  async sendCloudBan(opts: {
    issuedBy: string; targetUsername: string; targetId: string | number;
    reason: string; displayReason: string; durationDays: number | null;
  }): Promise<void> {
    const duration = opts.durationDays ? `${opts.durationDays} Tag(e)` : '**Permanent**';
    await this.send({ embeds: [{
      title:  '🔨  Player Banned (Open Cloud)',
      color:  0xEF4444,
      fields: [
        { name: 'Player',             value: `**${opts.targetUsername}** · \`${opts.targetId}\``, inline: true },
        { name: 'Duration',           value: duration,           inline: true },
        { name: 'Issued by',          value: `\`${opts.issuedBy}\``,      inline: true },
        { name: 'Internal Reason',    value: opts.reason },
        { name: 'Display Reason',     value: opts.displayReason },
      ],
      footer: { text: 'BWRP Game Panel' }, timestamp: new Date().toISOString(),
    }] });
  }

  // ── Cloud Unban ───────────────────────────────────────────────────────────

  async sendCloudUnban(opts: {
    issuedBy: string; targetUsername: string; targetId: string | number;
  }): Promise<void> {
    await this.send({ embeds: [{
      title:  '✅  Player Unbanned (Open Cloud)',
      color:  0x10B981,
      fields: [
        { name: 'Player',    value: `**${opts.targetUsername}** · \`${opts.targetId}\``, inline: true },
        { name: 'Issued by', value: `\`${opts.issuedBy}\``, inline: true },
      ],
      footer: { text: 'BWRP Game Panel' }, timestamp: new Date().toISOString(),
    }] });
  }

  // ── Generic Alert ─────────────────────────────────────────────────────────

  async sendAlert(title: string, description: string, color = 0xE2A800): Promise<void> {
    await this.send({
      embeds: [{
        title, description, color,
        footer:    { text: 'BWRP Staff Panel' },
        timestamp: new Date().toISOString(),
      }],
    });
  }
}

import type { Env, JWTPayload } from '../types/index.js';
import { json, err, requireRole } from '../middleware/auth.js';
import { DiscordService } from '../services/DiscordService.js';

export class DiscordController {
  // POST /api/discord/announce (ADMIN+)
  static async announce(request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'ADMIN');
    if (bad) return bad;

    if (!env.DISCORD_WEBHOOK_URL) return err('Discord Webhook nicht konfiguriert', 503, origin);

    const body = await request.json() as {
      title?:   string;
      message?: string;
      color?:   string;
      ping?:    string;
    };

    const message = (body.message ?? '').trim();
    if (!message) return err('Nachricht ist erforderlich', 400, origin);

    const title    = (body.title ?? '').trim().slice(0, 256) || undefined;
    const colorHex = (body.color ?? '#5865F2').replace('#', '');
    const colorInt = parseInt(colorHex, 16) || 0x5865F2;
    const ping     = body.ping ?? '';

    const payload: Record<string, unknown> = {
      embeds: [{
        title,
        description: message.slice(0, 2000),
        color:       colorInt,
        footer:      { text: `Gesendet von ${user.username} · BWRP Staff Panel` },
        timestamp:   new Date().toISOString(),
      }],
    };

    if (ping === '@everyone' || ping === '@here') {
      payload.content = ping;
    }

    try {
      const res = await fetch(env.DISCORD_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('[Discord] Announce failed:', res.status, await res.text().catch(() => ''));
        return err('Discord hat die Nachricht abgelehnt', 502, origin);
      }

      return json({ ok: true }, 200, origin);
    } catch {
      return err('Discord nicht erreichbar', 503, origin);
    }
  }

  // POST /api/discord/test (ADMIN+)
  static async test(_request: Request, env: Env, user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = requireRole(user, 'ADMIN');
    if (bad) return bad;

    if (!env.DISCORD_WEBHOOK_URL) return err('Discord Webhook nicht konfiguriert', 503, origin);

    try {
      const discord = new DiscordService(env);
      await discord.sendAlert(
        '🔌 Verbindungstest',
        `Webhook-Test von **${user.username}** erfolgreich. Verbindung aktiv.`,
        0x5865F2,
      );
      return json({ ok: true, webhookConfigured: true }, 200, origin);
    } catch {
      return err('Discord nicht erreichbar', 503, origin);
    }
  }
}

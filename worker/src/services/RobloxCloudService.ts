import type { Env } from '../types/index.js';

const CLOUD_BASE = 'https://apis.roblox.com';

/**
 * Convert an ISO 8601 duration string (e.g. "P7D", "PT2H30M") to the
 * protobuf Duration format that Roblox Cloud v2 expects: "{seconds}s".
 * Returns null if the string cannot be parsed.
 */
function iso8601ToProtoSeconds(iso: string): string | null {
  const m = iso.match(
    /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!m) return null;
  const [, y=0, mo=0, w=0, d=0, h=0, min=0, s=0] = m.map(v => parseFloat(v ?? '0') || 0);
  const total = Math.round(
    s + min * 60 + h * 3600 + d * 86400 + w * 604800 + mo * 2592000 + y * 31536000,
  );
  return total > 0 ? `${total}s` : null;
}

/**
 * RobloxCloudService – Handles communication with Roblox Open Cloud APIs
 * Docs: https://create.roblox.com/docs/open-cloud
 */
export class RobloxCloudService {
  private universeId: string;
  private apiKey: string;
  private origin: string;

  constructor(env: Env) {
    this.universeId = env.ROBLOX_UNIVERSE_ID;
    this.apiKey = env.ROBLOX_CLOUD_KEY ?? '';
    this.origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
  }

  private requireKey(): void {
    if (!this.apiKey) throw new Error('ROBLOX_CLOUD_KEY ist nicht konfiguriert. Bitte als Wrangler Secret hinterlegen.');
  }

  // ─── MessagingService ──────────────────────────────────────────────────────

  /**
   * Publish a JSON message to a MessagingService topic.
   * All live servers subscribed to the topic will receive it.
   * @param topic  e.g. "StaffPanelUpdates"
   * @param data   Any JSON-serialisable payload
   */
  async publishMessage(topic: string, data: Record<string, unknown>): Promise<void> {
    this.requireKey();

    const url = `${CLOUD_BASE}/messaging-service/v1/universes/${this.universeId}/topics/${encodeURIComponent(topic)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: JSON.stringify(data) }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MessagingService Fehler ${res.status}: ${text}`);
    }
  }

  // ─── User Restrictions (native Roblox Bans) ────────────────────────────────

  /**
   * Permanently or temporarily ban a user at the universe level.
   * @param userId     Roblox user ID (number)
   * @param reason     Visible reason string
   * @param displayReason  Player-visible reason (shown on kick screen)
   * @param duration   ISO 8601 duration string e.g. "P7D" (7 days), null = permanent
   */
  async banUser(params: {
    userId: number;
    reason: string;
    displayReason: string;
    duration: string | null;
  }): Promise<void> {
    this.requireKey();

    const { userId, reason, displayReason, duration } = params;
    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;

    const gameJoinRestriction: Record<string, unknown> = {
      active: true,
      privateReason: reason,
      displayReason: displayReason,
      excludeAltAccounts: false,
      inherited: true,
    };
    if (duration) {
      // Roblox Cloud v2 expects protobuf Duration format ("86400s"), not ISO 8601 ("P1D").
      const proto = iso8601ToProtoSeconds(duration);
      if (proto) gameJoinRestriction.duration = proto;
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameJoinRestriction }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`UserRestrictions Fehler ${res.status}: ${text}`);
    }
  }

  /**
   * Remove an active ban / user restriction.
   */
  async unbanUser(userId: number): Promise<void> {
    this.requireKey();

    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameJoinRestriction: { active: false },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unban Fehler ${res.status}: ${text}`);
    }
  }

  /**
   * Get current restriction status for a user.
   */
  async getRestriction(userId: number): Promise<Record<string, unknown>> {
    this.requireKey();

    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;
    const res = await fetch(url, {
      headers: { 'x-api-key': this.apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GetRestriction Fehler ${res.status}: ${text}`);
    }
    return res.json();
  }
}

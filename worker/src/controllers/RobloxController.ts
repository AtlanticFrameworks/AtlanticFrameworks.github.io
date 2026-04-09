import type { Env, JWTPayload } from '../types/index.js';
import { json, err } from '../middleware/auth.js';

const ROBLOX_USERS_API  = 'https://users.roblox.com/v1';
const ROBLOX_GROUPS_API = 'https://groups.roblox.com/v1';
const ROBLOX_GAMES_API  = 'https://games.roblox.com/v1';

// Neutral server-to-server headers — no Origin/Referer pointing to roblox.com,
// as that triggers Roblox's CSRF check (they expect a .ROBLOSECURITY cookie with it).
const ROBLOX_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function robloxFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...ROBLOX_FETCH_HEADERS, ...(init.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[Roblox] ${init.method ?? 'GET'} ${url} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

// Three possible outcomes for a username lookup:
//   found    → got a valid user ID from Roblox
//   notFound → Roblox responded successfully but the username doesn't exist
//   apiError → every endpoint returned non-2xx; likely an IP/rate-limit block
type UsernameResult =
  | { type: 'found';    userId: string }
  | { type: 'notFound' }
  | { type: 'apiError' };

async function resolveUsername(username: string): Promise<UsernameResult> {
  // ── Primary: legacy api.roblox.com ────────────────────────────────────────
  // Uses a different CDN/IP pool than users.roblox.com — more reachable from
  // Cloudflare Workers. Response: { Id: 12345, Username: "..." } or
  // { success: false, message: "..." } when the user doesn't exist.
  try {
    const res = await robloxFetch(
      `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`,
    );
    if (res.ok) {
      const raw  = await res.text();
      const data = JSON.parse(raw) as Record<string, unknown>;
      console.log(`[Roblox] legacy lookup "${username}":`, raw.slice(0, 200));
      const id = typeof data['Id'] === 'number' ? data['Id'] : 0;
      if (id > 0) return { type: 'found', userId: String(id) };
      // Id = 0 / missing = username not registered on Roblox
      return { type: 'notFound' };
    }
  } catch (e) {
    console.error('[Roblox] legacy lookup threw:', (e as Error).message);
  }

  // ── Fallback: v1 POST usernames/users ─────────────────────────────────────
  try {
    const res = await robloxFetch(`${ROBLOX_USERS_API}/usernames/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (res.ok) {
      const data = await res.json() as { data: Array<{ id: number }> };
      if (data.data?.length > 0) return { type: 'found', userId: String(data.data[0].id) };
      return { type: 'notFound' };
    }
  } catch (e) {
    console.error('[Roblox] v1 POST lookup threw:', (e as Error).message);
  }

  // Both endpoints failed with non-2xx — treat as API unreachable
  return { type: 'apiError' };
}

export class RobloxController {
  // GET /api/roblox/player/:identifier  (username or numeric ID)
  static async getPlayer(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const id = params.identifier;
    if (!id) return err('Kein Identifier angegeben', 400, origin);

    try {
      let userId: string;

      if (/^\d+$/.test(id)) {
        userId = id;
      } else {
        const result = await resolveUsername(id);
        if (result.type === 'notFound') return err('Spieler nicht gefunden', 404, origin);
        if (result.type === 'apiError') return err('Roblox-API nicht erreichbar', 502, origin);
        userId = result.userId;
      }

      // Fetch profile + thumbnail in parallel
      const [profileRes, thumbRes] = await Promise.all([
        robloxFetch(`${ROBLOX_USERS_API}/users/${userId}`),
        robloxFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`),
      ]);

      if (!profileRes.ok) return err('Spieler nicht gefunden', 404, origin);
      const profile = await profileRes.json() as { id: number; name: string; displayName: string; description: string; created: string; isBanned: boolean };

      let avatarUrl = '';
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json() as { data: Array<{ targetId: number; imageUrl: string; state: string }> };
        avatarUrl = thumbData.data?.[0]?.imageUrl ?? '';
      }

      return json({
        id:          profile.id,
        username:    profile.name,
        displayName: profile.displayName,
        description: profile.description,
        created:     profile.created,
        isBanned:    profile.isBanned,
        avatarUrl,
        profileUrl:  `https://www.roblox.com/users/${profile.id}/profile`,
      }, 200, origin);
    } catch (e) {
      return err('Roblox-API-Fehler: ' + (e as Error).message, 502, origin);
    }
  }

  // GET /api/roblox/group/roles  – All roles in the configured Roblox group
  static async getGroupRoles(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    try {
      const res = await robloxFetch(`${ROBLOX_GROUPS_API}/groups/${env.ROBLOX_GROUP_ID}/roles`);
      if (!res.ok) return err('Roblox Groups API nicht erreichbar', 502, origin);
      return json(await res.json(), 200, origin);
    } catch (e) {
      return err('Gruppen-API-Fehler: ' + (e as Error).message, 502, origin);
    }
  }

  // GET /api/roblox/group/roles/:roleId/users  – Members of a specific role (with avatar URLs)
  static async getGroupRoleUsers(_request: Request, env: Env, _user: JWTPayload, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (!params.roleId || !/^\d+$/.test(params.roleId)) return err('Ungültige roleId', 400, origin);
    try {
      const res = await robloxFetch(
        `${ROBLOX_GROUPS_API}/groups/${env.ROBLOX_GROUP_ID}/roles/${params.roleId}/users?sortOrder=Asc&limit=100`,
      );
      if (!res.ok) return err('Roblox Groups API nicht erreichbar', 502, origin);
      const data = await res.json() as { data: Array<{ userId: number; username: string; displayName: string }> };
      const members = data.data ?? [];

      // Batch-resolve headshot thumbnails (single API call for all members)
      const thumbnailMap: Record<number, string> = {};
      if (members.length) {
        try {
          const ids = members.map(m => m.userId).join(',');
          const thumbRes = await robloxFetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=false`,
          );
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json() as { data: Array<{ targetId: number; imageUrl: string; state: string }> };
            thumbData.data.forEach(t => { if (t.state === 'Completed') thumbnailMap[t.targetId] = t.imageUrl; });
          }
        } catch { /* thumbnails are optional */ }
      }

      return json({
        data: members.map(m => ({ ...m, avatarUrl: thumbnailMap[m.userId] ?? null })),
      }, 200, origin);
    } catch (e) {
      return err('Mitglieder-API-Fehler: ' + (e as Error).message, 502, origin);
    }
  }

  // GET /api/roblox/servers  – Live server list (uses Place ID, not Universe ID)
  static async getServers(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const placeId = env.ROBLOX_PLACE_ID;
    if (!placeId) return err('ROBLOX_PLACE_ID nicht konfiguriert', 503, origin);

    try {
      const res = await robloxFetch(
        `${ROBLOX_GAMES_API}/games/${placeId}/servers/Public?sortOrder=Desc&limit=25&excludeFullGames=false`,
      );
      if (!res.ok) return err('Roblox-Server-API nicht erreichbar', 502, origin);

      const data = await res.json() as {
        data: Array<{ id: string; maxPlayers: number; playing: number; ping: number; fps: number }>;
      };

      const servers = (data.data ?? []).map((s, i) => ({
        index:      i + 1,
        jobId:      s.id,
        players:    s.playing,
        maxPlayers: s.maxPlayers,
        ping:       Math.round(s.ping ?? 0),
        fps:        Math.round(s.fps ?? 0),
      }));

      const totalPlayers = servers.reduce((sum, s) => sum + s.players, 0);
      return json({ servers, totalPlayers, serverCount: servers.length }, 200, origin);
    } catch (e) {
      return err('Server-Abfrage fehlgeschlagen: ' + (e as Error).message, 502, origin);
    }
  }
}

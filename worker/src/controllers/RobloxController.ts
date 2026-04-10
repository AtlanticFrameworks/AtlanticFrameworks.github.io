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

async function cloudFetch(env: Env, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = { 
    ...ROBLOX_FETCH_HEADERS, 
    'x-api-key': env.ROBLOX_CLOUD_KEY,
    ...(init.headers as Record<string, string> ?? {}) 
  };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[Roblox-Cloud] ${init.method ?? 'GET'} ${url} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

// Three possible outcomes for a username lookup:
//   found    → got a valid user ID from Roblox
//   notFound → Roblox responded successfully but the username doesn't exist
//   apiError → request failed (e.g. invalid key, rate limit, or network error)
type UsernameResult =
  | { type: 'found';    userId: string }
  | { type: 'notFound' }
  | { type: 'apiError' };

async function resolveUsername(env: Env, username: string): Promise<UsernameResult> {
  try {
    // Roblox Open Cloud v2 User Search
    // Filter syntax: username == "name"
    const url = `https://apis.roblox.com/cloud/v2/users?filter=${encodeURIComponent(`username == "${username}"`)}`;
    const res = await cloudFetch(env, url);

    if (res.ok) {
      const data = await res.json() as { users?: Array<{ id: string }> };
      if (data.users && data.users.length > 0) {
        return { type: 'found', userId: data.users[0].id };
      }
      return { type: 'notFound' };
    }
    return { type: 'apiError' };
  } catch (e) {
    console.error('[Roblox-Cloud] resolveUsername threw:', (e as Error).message);
    return { type: 'apiError' };
  }
}

export class RobloxController {
  // GET /api/roblox/player/:identifier  (username or numeric ID)
  static async getPlayer(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const identifier = params.identifier;
    if (!identifier) return err('Kein Identifier angegeben', 400, origin);

    try {
      let userId: string;

      if (/^\d+$/.test(identifier)) {
        userId = identifier;
      } else {
        const result = await resolveUsername(env, identifier);
        if (result.type === 'notFound') return err('Spieler nicht gefunden', 404, origin);
        if (result.type === 'apiError') return err('Roblox-API (Cloud) nicht erreichbar. Prüfe API-Key Berechtigungen.', 502, origin);
        userId = result.userId;
      }

      // Fetch profile via Open Cloud + thumbnail via Public API
      // (Thumbnails don't have a direct Cloud v2 equivalent that is simpler than public v1)
      const [profileRes, thumbRes] = await Promise.all([
        cloudFetch(env, `https://apis.roblox.com/cloud/v2/users/${userId}`),
        robloxFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`),
      ]);

      if (!profileRes.ok) {
         if (profileRes.status === 404) return err('Spieler nicht gefunden', 404, origin);
         return err('Roblox-Cloud-Fehler bei Profilabfrage', 502, origin);
      }
      
      const profile = await profileRes.json() as { 
        id: string; 
        username: string; 
        displayName: string; 
        createTime: string; 
      };

      let avatarUrl = '';
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json() as { data: Array<{ targetId: number; imageUrl: string; state: string }> };
        avatarUrl = thumbData.data?.[0]?.imageUrl ?? '';
      }

      return json({
        id:          profile.id,
        username:    profile.username,
        displayName: profile.displayName,
        description: '', // Open Cloud v2 User does not currently return description
        created:     profile.createTime,
        isBanned:    false, // Open Cloud v2 User does not currently return ban status
        avatarUrl,
        profileUrl:  `https://www.roblox.com/users/${profile.id}/profile`,
      }, 200, origin);
    } catch (e) {
      return err('Interner Fehler bei Spielerabfrage: ' + (e as Error).message, 500, origin);
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

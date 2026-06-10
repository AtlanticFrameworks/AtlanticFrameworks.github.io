import type { Env, JWTPayload } from '../types/index.js';
import { json, err } from '../middleware/auth.js';

const ROBLOX_USERS_API  = 'https://users.roblox.com/v1';
const ROBLOX_GROUPS_API = 'https://groups.roblox.com/v1';
const ROBLOX_GAMES_API  = 'https://games.roblox.com/v1';
const ROBLOX_OAUTH_URL  = 'https://apis.roblox.com/oauth/v1/token';
const THUMBNAIL_CLIENT_ID = '4476395122713340611';

// Module-level token cache (lives for the Worker instance lifetime)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getOAuthToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     THUMBNAIL_CLIENT_ID,
    client_secret: env.ROBLOX_POSTER_AUTH,
    scope:         'thumbnail:read',
  });

  const res = await fetch(ROBLOX_OAUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OAuth token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value:     data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.value;
}

type UsernameResult =
  | { type: 'found';    userId: string }
  | { type: 'notFound' }
  | { type: 'apiError'; status: number; message: string; debugUrl: string };

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
    'Accept':    'application/json',
    ...(init.headers as Record<string, string> ?? {}) 
  };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[Roblox-Cloud] ${init.method ?? 'GET'} ${url} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

// POST /v1/usernames/users — no CSRF required (designed as server-to-server).
// Minimal headers only: spoofed browser UA on POST endpoints triggers Roblox WAF.
// Falls back to GET /v1/users?username= if the POST endpoint returns an error
// (Roblox occasionally rate-limits or 403s Workers on the POST endpoint).
async function resolveUsername(_env: Env, username: string): Promise<UsernameResult> {
  try {
    const res = await fetch(`${ROBLOX_USERS_API}/usernames/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });

    if (res.ok) {
      const data = await res.json() as {
        data: Array<{ requestedUsername: string; id: number; name: string; displayName: string }>;
      };
      if (data.data && data.data.length > 0) {
        console.log(`[Roblox] Resolved "${username}" → ${data.data[0].id}`);
        return { type: 'found', userId: String(data.data[0].id) };
      }
      return { type: 'notFound' };
    }

    // POST failed — fall back to the GET search endpoint
    console.warn(`[Roblox] username POST ${res.status}, falling back to GET search`);
  } catch (e) {
    console.warn('[Roblox] username POST threw, falling back to GET search:', (e as Error).message);
  }

  // Fallback: GET /v1/users/search?keyword= (no CSRF, no WAF issues)
  try {
    const searchRes = await fetch(
      `${ROBLOX_USERS_API}/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (searchRes.ok) {
      const data = await searchRes.json() as { data: Array<{ id: number; name: string }> };
      const exact = data.data?.find(u => u.name.toLowerCase() === username.toLowerCase());
      if (exact) {
        console.log(`[Roblox] Resolved "${username}" via search fallback → ${exact.id}`);
        return { type: 'found', userId: String(exact.id) };
      }
      return { type: 'notFound' };
    }
    const body = await searchRes.text().catch(() => '');
    console.error(`[Roblox] username search fallback ${searchRes.status}: ${body.slice(0, 200)}`);
    return { type: 'apiError', status: searchRes.status, message: body.slice(0, 200) || `Roblox ${searchRes.status}`, debugUrl: 'v1/users/search' };
  } catch (e) {
    console.error('[Roblox] username search fallback threw:', (e as Error).message);
    return { type: 'apiError', status: 500, message: (e as Error).message, debugUrl: 'v1/users/search' };
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
        if (result.type === 'apiError') {
          return err(`Roblox-API-Fehler (${result.status}): ${result.message}`, 502, origin);
        }
        userId = result.userId;
      }

      // ── Profile lookup ─────────────────────────────────────────────────────
      // We try Cloud v2 first (if key exists), then fallback to v1
      let profile: { id: string; username: string; displayName: string; created: string; description: string; isBanned: boolean };

      try {
        const profileRes = await cloudFetch(env, `https://apis.roblox.com/cloud/v2/users/${userId}`);
        if (profileRes.ok) {
          const data = await profileRes.json() as { id: number; name: string; displayName: string; createTime: string };
          profile = {
            id:          String(data.id),
            username:    data.name,
            displayName: data.displayName,
            created:     data.createTime,
            description: '',
            isBanned:    false
          };
        } else {
          throw new Error(`Profile v2 failed: ${profileRes.status}`);
        }
      } catch {
        // Fallback to Public v1 API
        const profileRes = await robloxFetch(`${ROBLOX_USERS_API}/users/${userId}`);
        if (!profileRes.ok) return err('Spieler-Profil nicht gefunden (V1 Fallback)', 404, origin);
        
        const data = await profileRes.json() as { id: number; name: string; displayName: string; created: string; description: string; isBanned: boolean };
        profile = {
          id:          String(data.id),
          username:    data.name,
          displayName: data.displayName,
          created:     data.created,
          description: data.description,
          isBanned:    data.isBanned
        };
      }

      // Fetch thumbnail (always via Public Thumbnails API)
      const thumbRes = await robloxFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
      let avatarUrl = '';
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json() as { data: Array<{ targetId: number; imageUrl: string; state: string }> };
        avatarUrl = thumbData.data?.[0]?.imageUrl ?? '';
      }

      return json({
        id:          profile.id,
        username:    profile.username,
        displayName: profile.displayName,
        description: profile.description,
        created:     profile.created,
        isBanned:    profile.isBanned,
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
  static async getGroupRoleUsers(request: Request, env: Env, _user?: JWTPayload, params?: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    // params may be undefined when called as a public route (dispatcher only passes request, env)
    let roleId = params?.roleId;
    if (!roleId) {
      const m = new URL(request.url).pathname.match(/\/roles\/(\d+)\/users/);
      roleId = m?.[1];
    }
    if (!roleId || !/^\d+$/.test(roleId)) return err('Ungültige roleId', 400, origin);
    try {
      const res = await robloxFetch(
        `${ROBLOX_GROUPS_API}/groups/${env.ROBLOX_GROUP_ID}/roles/${roleId}/users?sortOrder=Asc&limit=100`,
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

  // GET /api/roblox/thumbnail/3d?userId=XXX  — public, no auth required
  // Uses Roblox OAuth client credentials (thumbnail:read scope) to authenticate.
  static async get3dThumbnail(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId || !/^\d+$/.test(userId)) return err('Ungültige userId', 400, origin);

    try {
      const token = await getOAuthToken(env);
      const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        },
      });
      if (!res.ok) return err(`Roblox thumbnail API returned ${res.status}`, 502, origin);
      return json(await res.json(), 200, origin);
    } catch (e) {
      return err('3D-Thumbnail-Abruf fehlgeschlagen: ' + (e as Error).message, 502, origin);
    }
  }

  // GET /api/roblox/thumbnail/headshot?userId=XXX&size=420x420  — public, no auth required
  static async getHeadshotThumbnail(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const size   = searchParams.get('size') ?? '420x420';
    if (!userId || !/^\d+$/.test(userId)) return err('Ungültige userId', 400, origin);
    if (!/^\d+x\d+$/.test(size))          return err('Ungültige size', 400, origin);

    try {
      const res = await robloxFetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`,
      );
      if (!res.ok) return err(`Roblox thumbnail API returned ${res.status}`, 502, origin);
      return json(await res.json(), 200, origin);
    } catch (e) {
      return err('Headshot-Abruf fehlgeschlagen: ' + (e as Error).message, 502, origin);
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

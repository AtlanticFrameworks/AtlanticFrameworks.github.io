import type { Env, JWTPayload } from '../types/index.js';
import { json, err } from '../middleware/auth.js';

const ROBLOX_USERS_API  = 'https://users.roblox.com/v1';
const ROBLOX_GROUPS_API = 'https://groups.roblox.com/v1';
const ROBLOX_GAMES_API  = 'https://games.roblox.com/v1';

export class RobloxController {
  // GET /api/roblox/player/:identifier  (username or numeric ID)
  static async getPlayer(request: Request, env: Env, user: JWTPayload, params: Record<string,string>): Promise<Response> {
    const id = params.identifier;
    if (!id) return err('Kein Identifier angegeben');

    try {
      let userId: string;

      if (/^\d+$/.test(id)) {
        // Numeric ID
        userId = id;
      } else {
        // Username → resolve to ID
        const res  = await fetch(`${ROBLOX_USERS_API}/usernames/users`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ usernames: [id], excludeBannedUsers: false }),
        });
        if (!res.ok) return err('Roblox-API nicht erreichbar', 502);
        const data = await res.json() as { data: Array<{ id: number; name: string; displayName: string }> };
        if (!data.data.length) return err('Spieler nicht gefunden', 404);
        userId = String(data.data[0].id);
      }

      // Fetch profile + thumbnail in parallel
      const [profileRes, thumbRes] = await Promise.all([
        fetch(`${ROBLOX_USERS_API}/users/${userId}`),
        fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`),
      ]);

      if (!profileRes.ok) return err('Spieler nicht gefunden', 404);
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
      });
    } catch (e) {
      return err('Roblox-API-Fehler: ' + (e as Error).message, 502);
    }
  }

  // GET /api/roblox/group/roles  – All roles in the configured Roblox group
  static async getGroupRoles(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    try {
      const res = await fetch(`${ROBLOX_GROUPS_API}/groups/${env.ROBLOX_GROUP_ID}/roles`);
      if (!res.ok) return err('Roblox Groups API nicht erreichbar', 502);
      return json(await res.json());
    } catch (e) {
      return err('Gruppen-API-Fehler: ' + (e as Error).message, 502);
    }
  }

  // GET /api/roblox/group/roles/:roleId/users  – Members of a specific role (with avatar URLs)
  static async getGroupRoleUsers(_request: Request, env: Env, _user: JWTPayload, params: Record<string, string>): Promise<Response> {
    try {
      const res = await fetch(
        `${ROBLOX_GROUPS_API}/groups/${env.ROBLOX_GROUP_ID}/roles/${params.roleId}/users?sortOrder=Asc&limit=100`,
      );
      if (!res.ok) return err('Roblox Groups API nicht erreichbar', 502);
      const data = await res.json() as { data: Array<{ userId: number; username: string; displayName: string }> };
      const members = data.data ?? [];

      // Batch-resolve headshot thumbnails (single API call for all members)
      const thumbnailMap: Record<number, string> = {};
      if (members.length) {
        try {
          const ids = members.map(m => m.userId).join(',');
          const thumbRes = await fetch(
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
      });
    } catch (e) {
      return err('Mitglieder-API-Fehler: ' + (e as Error).message, 502);
    }
  }

  // GET /api/roblox/servers  – Live server list (uses Place ID, not Universe ID)
  static async getServers(_request: Request, env: Env, _user: JWTPayload): Promise<Response> {
    const placeId = env.ROBLOX_PLACE_ID;
    if (!placeId) return err('ROBLOX_PLACE_ID nicht konfiguriert', 503);

    try {
      const res = await fetch(
        `${ROBLOX_GAMES_API}/games/${placeId}/servers/Public?sortOrder=Desc&limit=25&excludeFullGames=false`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) return err('Roblox-Server-API nicht erreichbar', 502);

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
      return json({ servers, totalPlayers, serverCount: servers.length });
    } catch (e) {
      return err('Server-Abfrage fehlgeschlagen: ' + (e as Error).message, 502);
    }
  }
}

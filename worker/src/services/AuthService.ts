import type { Env, UserRow, Role } from '../types/index.js';
import { signJWT, verifyJWT, setCookie, clearCookie, getIP } from '../middleware/auth.js';

const ROBLOX_TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token';
const ROBLOX_USERINFO  = 'https://apis.roblox.com/oauth/v1/userinfo';

const ALLOWED_ROLES: Record<string, Role> = {
  'Group Owner':          'OWNER',
  'Ownership Team':       'OWNER',
  'Projektleitung':       'OWNER',
  'Projektverwaltung':    'OWNER',
  'Management':           'ADMIN',
  'Teamverwaltung':       'ADMIN',
  'Head Administrator':   'ADMIN',
  'Administrator':        'ADMIN',
  'Junior Administrator': 'MOD',
  'Head Game Moderator':  'MOD',
  'Game Moderator':       'MOD',
};

export class AuthService {
  constructor(private env: Env) {}

  async exchangeCode(code: string, redirectUri: string): Promise<{ robloxId: string; username: string; picture: string | null }> {
    const params = new URLSearchParams({
      client_id: '7548633832168341641', client_secret: this.env.ROBLOX_AUTH_SECRET,
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
    });
    const tokenRes  = await fetch(ROBLOX_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    if (!tokenRes.ok) throw new Error(`Token-Austausch fehlgeschlagen`);
    const { access_token } = await tokenRes.json() as { access_token: string };

    const userRes = await fetch(ROBLOX_USERINFO, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!userRes.ok) throw new Error('Userinfo-Abruf fehlgeschlagen');
    const u = await userRes.json() as { sub: string; preferred_username?: string; name?: string; picture?: string };
    return { robloxId: u.sub, username: u.preferred_username ?? u.name ?? 'Unbekannt', picture: u.picture ?? null };
  }

  async getRobloxRole(robloxId: string): Promise<Role | null> {
    try {
      const res  = await fetch(`https://groups.roblox.com/v2/users/${robloxId}/groups/roles`);
      if (!res.ok) return null;
      const data = await res.json() as { data: Array<{ group: { id: number }; role: { name: string } }> };
      const grp  = data.data.find(g => g.group.id === Number(this.env.ROBLOX_GROUP_ID));
      return grp ? (ALLOWED_ROLES[grp.role.name] ?? null) : null;
    } catch { return null; }
  }

  async upsertUser(robloxId: string, username: string, avatarUrl: string | null, role: Role): Promise<UserRow> {
    await this.env.DATABASE
      .prepare(`INSERT INTO users (roblox_id, username, avatar_url, role, last_seen)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT(roblox_id) DO UPDATE SET
                  username=excluded.username, avatar_url=excluded.avatar_url,
                  role=excluded.role, last_seen=datetime('now')`)
      .bind(robloxId, username, avatarUrl, role).run();
    const user = await this.env.DATABASE.prepare('SELECT * FROM users WHERE roblox_id = ?').bind(robloxId).first<UserRow>();
    if (!user) throw new Error('Benutzer konnte nicht angelegt werden');
    return user;
  }

  // Returns Set-Cookie header strings for both tokens
  async createSession(user: UserRow, request: Request): Promise<{ accessCookie: string; refreshCookie: string }> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      signJWT({ sub: String(user.id), robloxId: user.roblox_id, username: user.username, role: user.role, iat: now, exp: now + 15 * 60 }, this.env.JWT_SECRET),
      signJWT({ sub: String(user.id), jti, iat: now, exp: now + 7 * 24 * 60 * 60 }, this.env.JWT_SECRET),
    ]);

    await this.env.DATABASE
      .prepare('INSERT INTO sessions (user_id, refresh_token, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, refreshToken, getIP(request), request.headers.get('User-Agent'), new Date((now + 7 * 86400) * 1000).toISOString())
      .run();

    return {
      accessCookie:  setCookie('bwrp_access',  accessToken,  15 * 60),
      refreshCookie: setCookie('bwrp_refresh', refreshToken, 7 * 86400),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    const payload = await verifyJWT(refreshToken, this.env.JWT_SECRET);
    if (!payload) return null;
    const session = await this.env.DATABASE
      .prepare("SELECT user_id FROM sessions WHERE refresh_token = ? AND expires_at > datetime('now')")
      .bind(refreshToken).first<{ user_id: number }>();
    if (!session) return null;
    const user = await this.env.DATABASE.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<UserRow>();
    if (!user) return null;
    const now = Math.floor(Date.now() / 1000);
    return signJWT({ sub: String(user.id), robloxId: user.roblox_id, username: user.username, role: user.role, iat: now, exp: now + 15 * 60 }, this.env.JWT_SECRET);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.env.DATABASE.prepare('DELETE FROM sessions WHERE refresh_token = ?').bind(refreshToken).run();
  }
}

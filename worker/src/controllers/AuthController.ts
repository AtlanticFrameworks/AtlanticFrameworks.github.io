import type { Env } from '../types/index.js';
import { AuthService } from '../services/AuthService.js';
import { json, err, getCookie, clearCookie, getIP, auditLog } from '../middleware/auth.js';

export class AuthController {
  static async login(request: Request, env: Env): Promise<Response> {
    let body: { code?: string; redirect_uri?: string };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body'); }

    const { code, redirect_uri } = body;
    if (!code) return err('Fehlender OAuth-Code');

    const svc = new AuthService(env);
    try {
      const roblox = await svc.exchangeCode(code, redirect_uri ?? 'https://bwrp.net/team');
      const role   = await svc.getRobloxRole(roblox.robloxId);
      if (!role)   return err('Zugriff verweigert: Rang unzureichend oder kein Gruppenmitglied', 403);

      const user   = await svc.upsertUser(roblox.robloxId, roblox.username, roblox.picture, role);
      const cookies = await svc.createSession(user, request);

      await auditLog(env.DATABASE, user.id, 'LOGIN', 'sessions', undefined, { ip: getIP(request) }, getIP(request));

      const loginHeaders = new Headers({
        'Content-Type':                     'application/json',
        'Access-Control-Allow-Origin':       env.ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
      });
      loginHeaders.append('Set-Cookie', cookies.accessCookie);
      loginHeaders.append('Set-Cookie', cookies.refreshCookie);
      return new Response(JSON.stringify({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatar_url },
      }), { status: 200, headers: loginHeaders });
    } catch (e) {
      return err((e as Error).message, 500, env.ALLOWED_ORIGIN ?? 'https://bwrp.net');
    }
  }

  static async refresh(request: Request, env: Env): Promise<Response> {
    const refreshToken = getCookie(request, 'bwrp_refresh');
    if (!refreshToken) return err('Kein Refresh-Token', 401);

    const svc = new AuthService(env);
    const newAccess = await svc.refreshAccessToken(refreshToken);
    if (!newAccess)   return err('Refresh-Token ungültig oder abgelaufen', 401);

    const { setCookie } = await import('../middleware/auth.js');
    // Re-issue access cookie
    const accessCookie = (await import('../middleware/auth.js')).setCookie('bwrp_access', newAccess, 15 * 60);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type':                     'application/json',
        'Access-Control-Allow-Origin':       env.ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie':                        accessCookie,
      },
    });
  }

  static async logout(request: Request, env: Env): Promise<Response> {
    const refreshToken = getCookie(request, 'bwrp_refresh');
    if (refreshToken) {
      const svc = new AuthService(env);
      await svc.logout(refreshToken);
    }
    const logoutHeaders = new Headers({
      'Content-Type':                     'application/json',
      'Access-Control-Allow-Origin':       env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    logoutHeaders.append('Set-Cookie', clearCookie('bwrp_access'));
    logoutHeaders.append('Set-Cookie', clearCookie('bwrp_refresh'));
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: logoutHeaders });
  }
}

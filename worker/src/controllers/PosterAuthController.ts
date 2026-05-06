import type { Env } from '../types/index.js';
import { json, err } from '../middleware/auth.js';

const ROBLOX_TOKEN_URL    = 'https://apis.roblox.com/oauth/v1/token';
const ROBLOX_USERINFO_URL = 'https://apis.roblox.com/oauth/v1/userinfo';
const POSTER_CLIENT_ID    = '4476395122713340611';
const POSTER_REDIRECT_URI = 'https://bwrp.net/poster';

export class PosterAuthController {
  // POST /api/poster/auth/exchange  — public, no JWT required
  // Exchanges a Roblox authorization code for the user's Roblox ID and username.
  // Uses the poster OAuth app (ROBLOX_POSTER_AUTH secret, scopes: openid profile).
  static async exchangeCode(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';

    let body: { code?: string };
    try { body = await request.json(); } catch { return err('Ungültiger JSON-Body', 400, origin); }

    const { code } = body;
    if (!code || typeof code !== 'string' || code.length > 512) {
      return err('Fehlender oder ungültiger OAuth-Code', 400, origin);
    }

    // Step 1 — Exchange code for access token
    const tokenBody = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     POSTER_CLIENT_ID,
      client_secret: env.ROBLOX_POSTER_AUTH,
      redirect_uri:  POSTER_REDIRECT_URI,
    });

    const tokenRes = await fetch(ROBLOX_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '');
      console.error(`[PosterAuth] Token exchange failed (${tokenRes.status}): ${text.slice(0, 300)}`);
      return err(`Token-Austausch fehlgeschlagen (${tokenRes.status})`, 502, origin);
    }

    const tokens = await tokenRes.json() as { access_token: string };

    // Step 2 — Fetch user identity from Roblox userinfo endpoint
    const userRes = await fetch(ROBLOX_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept':        'application/json',
      },
    });

    if (!userRes.ok) {
      console.error(`[PosterAuth] Userinfo failed (${userRes.status})`);
      return err('Benutzerinfo konnte nicht abgerufen werden', 502, origin);
    }

    const userInfo = await userRes.json() as {
      sub:                string;   // Roblox user ID
      name:               string;   // display name
      nickname?:          string;   // username
      preferred_username?: string;  // username (preferred field)
    };

    return json({
      userId:      userInfo.sub,
      username:    userInfo.preferred_username ?? userInfo.nickname ?? userInfo.name,
      displayName: userInfo.name,
      accessToken: tokens.access_token,
    }, 200, origin);
  }
}

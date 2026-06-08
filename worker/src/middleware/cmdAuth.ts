import type { Env } from '../types/index.js';
import { verifySession } from '../utils/totp.js';

/**
 * Validates the cmd session token from Authorization: Bearer <token>.
 * Returns null on success, or a 401/500 Response on failure.
 */
export async function requireCmdToken(request: Request, env: Env): Promise<null | Response> {
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'CMD-Token fehlt' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7);
  if (!env.DOCS_TOTP_SECRET) {
    return new Response(JSON.stringify({ error: 'Server-Konfigurationsfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const expires = await verifySession(env.DOCS_TOTP_SECRET, token);
  if (!expires) {
    return new Response(JSON.stringify({ error: 'CMD-Token ungültig oder abgelaufen' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

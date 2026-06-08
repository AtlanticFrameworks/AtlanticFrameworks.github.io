import type { Env } from '../types/index.js';
import { verifySession } from '../utils/totp.js';
import { err } from './auth.js';

/**
 * Validates the cmd session token from Authorization: Bearer <token>.
 * Returns null on success, or a 401/500 Response on failure.
 */
export async function requireCmdToken(request: Request, env: Env): Promise<null | Response> {
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return err('CMD-Token fehlt', 401, env.ALLOWED_ORIGIN ?? 'https://bwrp.net');
  }
  const token = authHeader.slice(7);
  if (!env.DOCS_TOTP_SECRET) {
    return err('Server-Konfigurationsfehler', 500, env.ALLOWED_ORIGIN ?? 'https://bwrp.net');
  }
  const expires = await verifySession(env.DOCS_TOTP_SECRET, token);
  if (!expires) {
    return err('CMD-Token ungültig oder abgelaufen', 401, env.ALLOWED_ORIGIN ?? 'https://bwrp.net');
  }
  return null;
}

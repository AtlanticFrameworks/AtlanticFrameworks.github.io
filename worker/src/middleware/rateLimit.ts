import type { Env } from '../types/index.js';
import { corsHeaders } from './auth.js';

/**
 * D1-backed sliding-window rate limiter.
 * Returns a 429 Response if the limit is exceeded, or null to allow the request.
 *
 * Window key: `${ip}:${bucket}:${windowIndex}`
 * Cleanup of stale entries runs probabilistically (1 % of requests) to keep the table small.
 */
export async function checkRateLimit(
  env: Env,
  ip: string,
  bucket: string,      // logical group, e.g. 'auth' or 'cloud'
  maxRequests: number, // max requests allowed per window
  windowSecs: number,  // window size in seconds
): Promise<Response | null> {
  const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';

  try {
    const windowIndex = Math.floor(Date.now() / (windowSecs * 1000));
    const key = `${ip}:${bucket}:${windowIndex}`;

    // Atomically insert or increment
    const row = await env.DATABASE
      .prepare(`
        INSERT INTO rate_limits (key, count, window_start)
        VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET count = count + 1
        RETURNING count
      `)
      .bind(key, windowIndex)
      .first<{ count: number }>();

    const count = row?.count ?? 1;

    if (count > maxRequests) {
      const resetAt = (windowIndex + 1) * windowSecs;
      const retryAfter = resetAt - Math.floor(Date.now() / 1000);
      return new Response(
        JSON.stringify({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            'Retry-After':          String(Math.max(1, retryAfter)),
            'X-RateLimit-Limit':    String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':    String(resetAt),
          },
        },
      );
    }

    // Probabilistic cleanup — delete entries older than 2 full windows (1 % of requests)
    if (Math.random() < 0.01) {
      await env.DATABASE
        .prepare('DELETE FROM rate_limits WHERE window_start < ?')
        .bind(windowIndex - 2)
        .run()
        .catch(() => {}); // non-critical
    }

    return null; // request allowed
  } catch (e) {
    // If rate limiting table is missing or any DB error — fail open (don't block the request)
    console.error('[RateLimit] DB error:', (e as Error).message);
    return null;
  }
}

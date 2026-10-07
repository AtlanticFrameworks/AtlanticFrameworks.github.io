import type { Env } from '../types/index.js';

function reply(status: number, body: Record<string, string>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

/** Accept a YouTube embed, watch or share URL; never return arbitrary URLs. */
function videoEmbed(link: string): string | null {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const hosts = ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    else if (hosts.includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else id = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export class ClearanceController {
  static async unlock(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('Origin') !== (env.ALLOWED_ORIGIN ?? 'https://bwrp.net')) {
      return reply(403, { error: 'Zugriff verweigert.' });
    }
    if (!env.SECRET_TARGET_HASH?.trim() || !env.SECRET_VIDEO_LINK?.trim()) {
      return reply(503, { error: 'Terminal vorübergehend nicht verfügbar.' });
    }
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
      return reply(415, { error: 'Ungültige Anfrage.' });
    }

    // Dedicated atomic limiter: fail closed if the database is unavailable.
    const window = Math.floor(Date.now() / 60000);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    try {
      const row = await env.DATABASE.prepare(
        'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count',
      ).bind(`${ip}:clearance:${window}`, window).first<{ count: number }>();
      if (!row) return reply(503, { error: 'Terminal vorübergehend nicht verfügbar.' });
      if (row.count > 5) return reply(429, { error: 'Zu viele Versuche. Bitte eine Minute warten.' }, { 'Retry-After': '60' });
    } catch {
      return reply(503, { error: 'Terminal vorübergehend nicht verfügbar.' });
    }

    // Bound the streamed body, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Ungültige Anfrage.' });
    let raw = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 1024) {
          await reader.cancel();
          return reply(413, { error: 'Ungültige Anfrage.' });
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      const body = JSON.parse(raw);
      if (!body || typeof body.key !== 'string' || !body.key.trim() || body.key.length > 256) {
        return reply(400, { error: 'Ungültige Anfrage.' });
      }
      // Keep the supplied terminal's case-insensitive key behavior. Hash both
      // values to fixed-size digests before comparison; no secret reaches HTML.
      const encoder = new TextEncoder();
      const [actual, expected] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(body.key.trim().toUpperCase())),
        crypto.subtle.digest('SHA-256', encoder.encode(env.SECRET_TARGET_HASH.trim().toUpperCase())),
      ]);
      const a = new Uint8Array(actual);
      const b = new Uint8Array(expected);
      let difference = 0;
      for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
      if (difference !== 0) return reply(401, { error: 'ACCESS DENIED.' });
      const videoUrl = videoEmbed(env.SECRET_VIDEO_LINK);
      if (!videoUrl) return reply(503, { error: 'Terminal vorübergehend nicht verfügbar.' });
      return reply(200, { videoUrl });
    } catch {
      return reply(400, { error: 'Ungültige Anfrage.' });
    }
  }
}

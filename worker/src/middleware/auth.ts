import type { Env, JWTPayload, Role } from '../types/index.js';
import { ROLE_RANK } from '../types/index.js';

// ─── JWT Helpers (Web Crypto API — no external deps) ─────────────────────────

function b64url(input: string | ArrayBuffer): string {
  const str = typeof input === 'string' ? input : String.fromCharCode(...new Uint8Array(input));
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

export async function signJWT(payload: object, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify(payload));
  const data   = `${header}.${body}`;
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key  = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = Uint8Array.from(b64urlDecode(sig), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(body)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

export function setCookie(name: string, value: string, maxAgeSeconds: number): string {
  // SameSite=None is required for cross-origin cookie sending (frontend on github.io → API on bwrp.net).
  // Secure is mandatory when SameSite=None.
  return `${name}=${value}; HttpOnly; Secure; SameSite=None; Path=/api; Max-Age=${maxAgeSeconds}`;
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=None; Path=/api; Max-Age=0`;
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  const match  = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':      origin,
    'Access-Control-Allow-Methods':     'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age':           '86400',
  };
}

export function handleOptions(origin: string): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function json(data: unknown, status = 200, origin = 'https://bwrp.net', extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });
}

export function err(message: string, status = 400, origin = 'https://bwrp.net'): Response {
  return json({ error: message }, status, origin);
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Reads the access token from the HttpOnly cookie `bwrp_access`

export async function requireAuth(request: Request, env: Env): Promise<JWTPayload | Response> {
  const token = getCookie(request, 'bwrp_access');
  if (!token) return err('Kein Authentifizierungs-Token', 401);

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload)  return err('Ungültiges oder abgelaufenes Token', 401);

  return payload;
}

export function requireRole(user: JWTPayload, minRole: Role): Response | null {
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    return err(`Zugriff verweigert. Mindestrang: ${minRole}`, 403);
  }
  return null;
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

export async function auditLog(
  db: D1Database,
  userId: number | null,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: object,
  ip?: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO audit_logs (user_id, action, resource, resource_id, metadata, ip) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, action, resource, resourceId ?? null, metadata ? JSON.stringify(metadata) : null, ip ?? null)
    .run();
}

export function getIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}

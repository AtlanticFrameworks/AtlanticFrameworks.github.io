/**
 * BWRP Staff Panel – Cloudflare Worker Entry Point
 * TypeScript | OOP | Cloudflare D1 | HttpOnly Cookies
 */

import type { Env, JWTPayload } from './types/index.js';
import { handleOptions, requireAuth, corsHeaders, err, getIP } from './middleware/auth.js';
import { checkRateLimit } from './middleware/rateLimit.js';
import { AuthController }       from './controllers/AuthController.js';
import { StaffController }      from './controllers/StaffController.js';
import { ModerationController } from './controllers/ModerationController.js';
import { ShiftController }      from './controllers/ShiftController.js';
import { RobloxController }     from './controllers/RobloxController.js';
import { WatchlistController }  from './controllers/WatchlistController.js';
import { CloudController }      from './controllers/CloudController.js';
import { DatabaseController }   from './controllers/DatabaseController.js';
import { renderDocs }           from './utils/docs.js';

// ─── Route Table ─────────────────────────────────────────────────────────────
// Pattern → Handler (auth-protected routes also receive the JWTPayload)

type Handler  = (req: Request, env: Env, user: JWTPayload, params: Record<string, string>) => Promise<Response>;
type UserlessHandler = (req: Request, env: Env) => Promise<Response>;

interface Route {
  method:  string;
  pattern: RegExp;
  keys:    string[];
  handler: Handler | UserlessHandler;
  public:  boolean;    // true = no JWT required
}

function route(method: string, path: string, handler: Handler | UserlessHandler, isPublic = false): Route {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' + path.replace(/:([^/]+)/g, (_: string, k: string) => { keys.push(k); return '([^/]+)'; }) + '$',
  );
  return { method, pattern, keys, handler, public: isPublic };
}

const ROUTES: Route[] = [
  // ── Public ──────────────────────────────────────────────────────────────
  route('GET',  '/api/docs',         ((_req, env) => renderDocs(env)) as UserlessHandler, true),
  route('POST', '/api/auth/login',   AuthController.login   as UserlessHandler, true),
  route('POST', '/api/auth/refresh', AuthController.refresh as UserlessHandler, true),
  route('POST', '/api/auth/logout',  AuthController.logout  as UserlessHandler, true),

  // ── Staff ────────────────────────────────────────────────────────────────
  route('GET',  '/api/staff/me',       StaffController.me       as Handler),
  route('GET',  '/api/staff/sessions', StaffController.sessions as Handler),
  route('GET',  '/api/staff/roster',   StaffController.roster   as Handler),
  route('GET',  '/api/staff/status',   StaffController.status   as Handler),
  route('GET',  '/api/staff/activity', StaffController.activity as Handler),
  route('GET',  '/api/staff/stats',    StaffController.stats    as Handler),

  // ── Watchlist ────────────────────────────────────────────────────────────
  route('GET',    '/api/watchlist',              WatchlistController.getAll as Handler),
  route('GET',    '/api/watchlist/check/:robloxId', WatchlistController.check as Handler),
  route('POST',   '/api/watchlist',              WatchlistController.add    as Handler),
  route('DELETE', '/api/watchlist/:id',          WatchlistController.remove as Handler),

  // ── Moderation ───────────────────────────────────────────────────────────
  route('GET',   '/api/moderation/all',             ModerationController.getAllCases as Handler),
  route('GET',   '/api/moderation/cases/:playerId', ModerationController.getCases    as Handler),
  route('POST',  '/api/moderation/cases',           ModerationController.createCase  as Handler),
  route('PATCH', '/api/moderation/cases/:caseId',   ModerationController.updateCase  as Handler),

  // ── Shifts ───────────────────────────────────────────────────────────────
  route('POST', '/api/shifts/start',     ShiftController.start     as Handler),
  route('POST', '/api/shifts/end',       ShiftController.end       as Handler),
  route('GET',  '/api/shifts/active',    ShiftController.active    as Handler),
  route('GET',  '/api/shifts/analytics', ShiftController.analytics as Handler),

  // ── Roblox Proxy ─────────────────────────────────────────────────────────
  route('GET', '/api/roblox/player/:identifier',          RobloxController.getPlayer        as Handler),
  route('GET', '/api/roblox/servers',                     RobloxController.getServers       as Handler),
  route('GET', '/api/roblox/group/roles',                 RobloxController.getGroupRoles    as Handler),
  route('GET', '/api/roblox/group/roles/:roleId/users',   RobloxController.getGroupRoleUsers as Handler),

  // ── Roblox Open Cloud ─────────────────────────────────────────────────────
  route('POST', '/api/cloud/kick',                        CloudController.kick           as Handler),
  route('POST', '/api/cloud/ban',                         CloudController.ban            as Handler),
  route('POST', '/api/cloud/unban',                       CloudController.unban          as Handler),
  route('GET',  '/api/cloud/restriction/:userId',         CloudController.getRestriction as Handler),

  // ── Database Management (OWNER only) ──────────────────────────────────────
  route('GET',    '/api/db/stats',                        DatabaseController.stats             as Handler),
  route('GET',    '/api/db/users',                        DatabaseController.listUsers         as Handler),
  route('PATCH',  '/api/db/users/:id',                    DatabaseController.updateUser        as Handler),
  route('DELETE', '/api/db/users/:id',                    DatabaseController.deleteUser        as Handler),
  route('GET',    '/api/db/cases',                        DatabaseController.listCases         as Handler),
  route('PATCH',  '/api/db/cases/:id',                    DatabaseController.updateCase        as Handler),
  route('DELETE', '/api/db/cases/:id',                    DatabaseController.deleteCase        as Handler),
  route('GET',    '/api/db/sessions',                     DatabaseController.listSessions      as Handler),
  route('DELETE', '/api/db/sessions/:id',                 DatabaseController.deleteSession     as Handler),
  route('GET',    '/api/db/audit-logs',                   DatabaseController.listAuditLogs     as Handler),
  route('GET',    '/api/db/server-status',                DatabaseController.listServerStatus  as Handler),
  route('PATCH',  '/api/db/server-status/:service',       DatabaseController.updateServerStatus as Handler),
  route('DELETE', '/api/db/rate-limits',                  DatabaseController.clearRateLimits   as Handler),
];

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const url    = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') return handleOptions(origin);

    // Only handle /api/* routes
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    const ip = getIP(request);

    // ── Rate Limiting ───────────────────────────────────────────────────────────
    // Auth endpoints: 10 req / 60 s per IP (brute-force protection)
    if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/refresh') {
      const limited = await checkRateLimit(env, ip, 'auth', 10, 60);
      if (limited) return limited;
    }
    // Open Cloud action endpoints: 30 req / 60 s per IP
    if (url.pathname.startsWith('/api/cloud/') && request.method !== 'GET') {
      const limited = await checkRateLimit(env, ip, 'cloud', 30, 60);
      if (limited) return limited;
    }
    // Roblox proxy endpoints: 60 req / 60 s per IP (avoid hammering Roblox API)
    if (url.pathname.startsWith('/api/roblox/')) {
      const limited = await checkRateLimit(env, ip, 'roblox', 60, 60);
      if (limited) return limited;
    }

    // Match route
    for (const r of ROUTES) {
      if (r.method !== request.method) continue;
      const match = url.pathname.match(r.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = match[i + 1]; });

      // Public routes — no JWT check
      if (r.public) {
        return (r.handler as UserlessHandler)(request, env);
      }

      // Protected routes — verify cookie token
      const auth = await requireAuth(request, env);
      if (auth instanceof Response) return auth;

      try {
        return await (r.handler as Handler)(request, env, auth, params);
      } catch (e) {
        console.error('Route error:', e);
        return err('Interner Server-Fehler: ' + (e as Error).message, 500, origin);
      }
    }

    return err('Route nicht gefunden', 404, origin);
  },
};

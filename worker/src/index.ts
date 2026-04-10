/**
 * BWRP Staff Panel – Cloudflare Worker Entry Point
 * TypeScript | OOP | Cloudflare D1 | HttpOnly Cookies
 */

import type { Env, JWTPayload } from './types/index.js';
import { handleOptions, requireAuth, corsHeaders, err, getIP, getCookie } from './middleware/auth.js';
import { checkRateLimit } from './middleware/rateLimit.js';
import { AuthController }       from './controllers/AuthController.js';
import { StaffController }      from './controllers/StaffController.js';
import { ModerationController } from './controllers/ModerationController.js';
import { ShiftController }      from './controllers/ShiftController.js';
import { RobloxController }     from './controllers/RobloxController.js';
import { WatchlistController }  from './controllers/WatchlistController.js';
import { CloudController }      from './controllers/CloudController.js';
import { DatabaseController }   from './controllers/DatabaseController.js';
import { ManagementController } from './controllers/ManagementController.js';
import { RolesController }      from './controllers/RolesController.js';
import { NotesController }      from './controllers/NotesController.js';
import { DiscordController }    from './controllers/DiscordController.js';
import { FriedenszeitController } from './controllers/FriedenszeitController.js';
import { renderDocs }           from './utils/docs.js';
import { verifyTOTP, signSession, verifySession } from './utils/totp.js';

// ─── Docs TOTP Gate ───────────────────────────────────────────────────────────

function docsGateHTML(error?: string): Response {
  const errorBanner = error
    ? `<p style="color:#ef4444;font-family:monospace;font-size:11px;letter-spacing:.05em;margin-bottom:16px;text-align:center">${error}</p>`
    : '';
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>API DOCS // BWRP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#08080a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'JetBrains Mono',monospace}
    .wrap{background:#111114;border:1px solid #252529;padding:40px 36px;width:300px}
    .eyebrow{font-size:9px;color:#71717a;letter-spacing:.15em;margin-bottom:10px}
    .title{font-size:16px;color:#fff;font-weight:700;letter-spacing:.08em;margin-bottom:6px}
    .sub{font-size:10px;color:#52525b;letter-spacing:.05em;margin-bottom:28px}
    input{width:100%;background:#08080a;border:1px solid #252529;color:#fff;font-family:inherit;font-size:22px;letter-spacing:.35em;padding:11px 14px;text-align:center;outline:none;margin-bottom:14px;transition:border-color .15s}
    input:focus{border-color:#e2a800}
    input::placeholder{color:#3f3f46;letter-spacing:.2em;font-size:16px}
    button{width:100%;background:rgba(226,168,0,.08);border:1px solid rgba(226,168,0,.35);color:#e2a800;font-family:inherit;font-size:10px;letter-spacing:.12em;padding:11px;cursor:pointer;transition:all .15s}
    button:hover{background:#e2a800;color:#000}
  </style>
</head>
<body>
  <div class="wrap">
    <p class="eyebrow">BWRP · STAFF SYSTEM</p>
    <p class="title">API REFERENZ</p>
    <p class="sub">ZUGANG GESICHERT</p>
    ${errorBanner}
    <form method="POST" action="/api/docs">
      <input type="text" name="code" maxlength="6" placeholder="000000"
             autocomplete="one-time-code" inputmode="numeric" autofocus pattern="\\d{6}">
      <button type="submit">AUTHENTIFIZIEREN</button>
    </form>
  </div>
</body>
</html>`;
  return new Response(html, {
    status:  error ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** Inject a live countdown banner into the docs HTML and return the response. */
async function renderDocsWithTimer(env: Env, expiresUnix: number): Promise<Response> {
  const docsHtml = await renderDocs(env).text();
  const remaining = expiresUnix - Math.floor(Date.now() / 1000);
  const totalSec  = 300; // 5 minutes

  const banner = `
<style>
  body { padding-top: 36px !important; }
  #docs-timer-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #0a0a0a; border-bottom: 1px solid #252529;
    display: flex; align-items: center; gap: 12px;
    padding: 7px 20px; font-family: 'JetBrains Mono', monospace;
  }
  #docs-timer-label { font-size: 9px; color: #71717a; letter-spacing: .12em; white-space: nowrap; }
  #docs-timer-track { flex: 1; background: #18181b; height: 3px; overflow: hidden; }
  #docs-timer-bar   { height: 100%; width: 100%; background: #e2a800; transition: width 1s linear, background .5s; }
  #docs-timer-text  { font-size: 11px; color: #e2a800; letter-spacing: .06em; min-width: 38px; text-align: right; }
</style>
<div id="docs-timer-banner">
  <span id="docs-timer-label">SESSION</span>
  <div id="docs-timer-track"><div id="docs-timer-bar"></div></div>
  <span id="docs-timer-text">5:00</span>
</div>
<script>
(function () {
  const EXPIRES = ${expiresUnix};
  const TOTAL   = ${totalSec};
  function tick() {
    const left = Math.max(0, EXPIRES - Math.floor(Date.now() / 1000));
    const m = Math.floor(left / 60);
    const s = left % 60;
    const txt = document.getElementById('docs-timer-text');
    const bar = document.getElementById('docs-timer-bar');
    if (txt) txt.textContent = m + ':' + String(s).padStart(2, '0');
    if (bar) {
      bar.style.width = (left / TOTAL * 100) + '%';
      bar.style.background = left < 60 ? '#ef4444' : left < 120 ? '#f97316' : '#e2a800';
      if (txt) txt.style.color = left < 60 ? '#ef4444' : left < 120 ? '#f97316' : '#e2a800';
    }
    if (left <= 0) {
      document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#08080a;gap:16px">'
        + '<p style="font-family:monospace;font-size:11px;color:#71717a;letter-spacing:.12em">SESSION ABGELAUFEN</p>'
        + '<a href="/api/docs" style="font-family:monospace;font-size:10px;color:#e2a800;letter-spacing:.1em;text-decoration:none;border:1px solid rgba(226,168,0,.3);padding:8px 20px">NEU ANMELDEN</a>'
        + '</div>';
      return;
    }
    setTimeout(tick, 1000);
  }
  tick();
})();
</script>`;

  // Inject banner right after <body> tag
  const injected = docsHtml.replace(/(<body[^>]*>)/i, `$1${banner}`);
  return new Response(injected, {
    status:  200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

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
  route('GET',  '/api/docs', (async (req, env) => {
    const cookie = getCookie(req, 'bwrp_docs_session');
    if (cookie && env.DOCS_TOTP_SECRET) {
      const expires = await verifySession(env.DOCS_TOTP_SECRET, cookie);
      if (expires) return renderDocsWithTimer(env, expires);
    }
    return docsGateHTML();
  }) as UserlessHandler, true),
  route('POST', '/api/docs', (async (req, env) => {
    const body = await req.text().catch(() => '');
    const code = new URLSearchParams(body).get('code') ?? '';
    if (!env.DOCS_TOTP_SECRET) return docsGateHTML('Server-Konfigurationsfehler.');
    const valid = await verifyTOTP(env.DOCS_TOTP_SECRET, code);
    if (!valid) return docsGateHTML('Falscher Code – bitte erneut versuchen.');
    const sessionVal = await signSession(env.DOCS_TOTP_SECRET, 300);
    const expiresUnix = Math.floor(Date.now() / 1000) + 300;
    const docsResp = await renderDocsWithTimer(env, expiresUnix);
    const headers = new Headers(docsResp.headers);
    headers.set('Set-Cookie', `bwrp_docs_session=${sessionVal}; HttpOnly; Secure; SameSite=Strict; Path=/api/docs; Max-Age=300`);
    return new Response(docsResp.body, { status: 200, headers });
  }) as UserlessHandler, true),
  route('POST', '/api/auth/login',   AuthController.login   as UserlessHandler, true),
  route('POST', '/api/auth/refresh', AuthController.refresh as UserlessHandler, true),
  route('POST', '/api/auth/logout',  AuthController.logout  as UserlessHandler, true),
  route('GET',  '/api/friedenszeit', FriedenszeitController.getStatus as UserlessHandler, true),

  // ── Staff ────────────────────────────────────────────────────────────────
  route('GET',  '/api/staff/me',       StaffController.me       as Handler),
  route('GET',  '/api/staff/verify',   StaffController.verify   as Handler),
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
  route('GET',  '/api/shifts/all',       ShiftController.all       as Handler),

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

  // ── Team Management (ADMIN+) ──────────────────────────────────────────────
  route('GET',    '/api/mgmt/users',                      ManagementController.listStaff      as Handler),
  route('PATCH',  '/api/mgmt/users/:id/hwid-reset',       ManagementController.resetHwid      as Handler),
  route('PATCH',  '/api/mgmt/users/:id/role',             ManagementController.updateRole     as Handler),
  route('GET',    '/api/mgmt/users/:id/activity',         ManagementController.getUserActivity as Handler),

  // ── Dynamic Roles (OWNER CRUD, ADMIN read/assign) ─────────────────────────
  route('GET',    '/api/roles/permissions',               RolesController.listPermissions as Handler),
  route('GET',    '/api/roles',                           RolesController.listRoles       as Handler),
  route('POST',   '/api/roles',                           RolesController.createRole      as Handler),
  route('PATCH',  '/api/roles/:id',                       RolesController.updateRole      as Handler),
  route('DELETE', '/api/roles/:id',                       RolesController.deleteRole      as Handler),
  route('GET',    '/api/roles/users/:userId',             RolesController.getUserRoles    as Handler),
  route('POST',   '/api/roles/users/:userId/assign',      RolesController.assignRole      as Handler),
  route('DELETE', '/api/roles/users/:userId/:roleId',     RolesController.removeRole      as Handler),

  // ── Personal Notes ────────────────────────────────────────────────────────
  route('GET',    '/api/notes',                           NotesController.getNote     as Handler),
  route('PUT',    '/api/notes',                           NotesController.saveNote    as Handler),
  route('POST',   '/api/notes/pin',                       NotesController.pinTicket   as Handler),
  route('POST',   '/api/notes/unpin',                     NotesController.unpinTicket as Handler),

  // ── Server Power Operations (ADMIN+) ─────────────────────────────────────
  route('POST',   '/api/cloud/servers/shutdown',          CloudController.shutdownServer as Handler),
  route('POST',   '/api/cloud/servers/restart-all',       CloudController.restartAll     as Handler),

  // ── Discord (ADMIN+) ─────────────────────────────────────────────────────
  route('POST',   '/api/discord/announce',                DiscordController.announce as Handler),
  route('POST',   '/api/discord/test',                    DiscordController.test     as Handler),

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

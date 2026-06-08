# Command Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Ctrl+K TOTP-authenticated command palette to every team panel page, providing a full sysadmin command set with autocomplete.

**Architecture:** A new `CommandController.ts` exposes `/api/cmd/*` routes protected by a new `requireCmdToken()` middleware that validates a 2-minute HMAC session token (issued by TOTP verification) from the `Authorization: Bearer` header. A self-contained `assets/js/cmd-terminal.js` IIFE renders the overlay UI, manages the auth session in memory, and handles all command execution and autocomplete.

**Tech Stack:** TypeScript + Cloudflare Workers D1 (backend); vanilla JS IIFE + CSS-in-JS overlay (frontend); existing `verifyTOTP`/`signSession`/`verifySession` from `worker/src/utils/totp.ts`; existing `RobloxCloudService`, `DiscordService`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `worker/src/middleware/cmdAuth.ts` | **Create** | `requireCmdToken()` — validates Bearer token against DOCS_TOTP_SECRET |
| `worker/src/controllers/CommandController.ts` | **Create** | All `/api/cmd/*` endpoints |
| `worker/src/index.ts` | **Modify** | Register 15 cmd routes |
| `assets/js/cmd-terminal.js` | **Create** | Overlay UI, state machine, autocomplete, command execution |
| `dbpanel.html` | **Modify** | Add `<script src="/assets/js/cmd-terminal.js">` |
| `dev.html` | **Modify** | Add `<script src="/assets/js/cmd-terminal.js">` |
| `studio.html` | **Modify** | Add `<script src="/assets/js/cmd-terminal.js">` |
| `team.html` | **Modify** | Add `<script src="/assets/js/cmd-terminal.js">` |

---

## Task 1: `requireCmdToken` Middleware

**Files:**
- Create: `worker/src/middleware/cmdAuth.ts`

- [ ] **Step 1: Create the file**

```typescript
// worker/src/middleware/cmdAuth.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `worker/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add worker/src/middleware/cmdAuth.ts
git commit -m "feat: add requireCmdToken middleware for cmd terminal"
```

---

## Task 2: CommandController — Auth + Autocomplete List Endpoints

**Files:**
- Create: `worker/src/controllers/CommandController.ts`

- [ ] **Step 1: Create the file with auth + list endpoints**

```typescript
// worker/src/controllers/CommandController.ts
import type { Env } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { verifyTOTP, signSession } from '../utils/totp.js';
import { requireCmdToken } from '../middleware/cmdAuth.js';

export class CommandController {

  // ── POST /api/cmd/auth ──────────────────────────────────────────────────
  static async auth(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    if (!env.DOCS_TOTP_SECRET) return err('Server-Konfigurationsfehler', 500, origin);

    const body: any = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) return err('Ungültiger Code — 6 Ziffern erwartet', 400, origin);

    const valid = await verifyTOTP(env.DOCS_TOTP_SECRET, code);
    if (!valid) return err('Falscher Code', 401, origin);

    const token = await signSession(env.DOCS_TOTP_SECRET, 120);
    const expires = Math.floor(Date.now() / 1000) + 120;

    await auditLog(env.DATABASE, null, 'CMD_AUTH', 'system', undefined, {}, getIP(request));

    return json({ token, expires }, 200, origin);
  }

  // ── GET /api/cmd/users ──────────────────────────────────────────────────
  static async listUsers(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare(
      'SELECT id, username, role FROM users ORDER BY username ASC'
    ).all<{ id: number; username: string; role: string }>();

    return json({ users: rows.results }, 200, origin);
  }

  // ── GET /api/cmd/serverstatus ───────────────────────────────────────────
  static async listServiceNames(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const rows = await env.DATABASE.prepare(
      'SELECT service FROM server_status ORDER BY service ASC'
    ).all<{ service: string }>();

    return json({ services: rows.results.map((r: { service: string }) => r.service) }, 200, origin);
  }
}
```

- [ ] **Step 2: Register the three routes in `worker/src/index.ts`**

Add these imports at the top of `index.ts` alongside the other controller imports:

```typescript
import { CommandController } from './controllers/CommandController.js';
```

Add these routes inside the `ROUTES` array, after the `PosterAuth` public routes block:

```typescript
  // ── Command Terminal ─────────────────────────────────────────────────────
  route('POST', '/api/cmd/auth',         CommandController.auth            as UserlessHandler, true),
  route('GET',  '/api/cmd/users',        CommandController.listUsers       as UserlessHandler, true),
  route('GET',  '/api/cmd/serverstatus', CommandController.listServiceNames as UserlessHandler, true),
```

> Note: These are marked `public: true` so the route dispatcher skips the JWT check — `requireCmdToken` inside each handler performs its own auth.

- [ ] **Step 3: Start local dev server**

From `worker/`:
```bash
npm run dev
```
Expected: `Ready on http://localhost:8787`

- [ ] **Step 4: Verify auth endpoint rejects bad codes**

```bash
curl -s -X POST http://localhost:8787/api/cmd/auth \
  -H "Content-Type: application/json" \
  -d '{"code":"000000"}'
```
Expected: `{"error":"Falscher Code"}` with HTTP 401.

- [ ] **Step 5: Verify users list requires token**

```bash
curl -s http://localhost:8787/api/cmd/users
```
Expected: `{"error":"CMD-Token fehlt"}` with HTTP 401.

- [ ] **Step 6: Authenticate with a real TOTP code**

Open your authenticator app, get the current 6-digit code, then:
```bash
curl -s -X POST http://localhost:8787/api/cmd/auth \
  -H "Content-Type: application/json" \
  -d '{"code":"<YOUR_CODE>"}'
```
Expected: `{"token":"<expires>.<hmac>","expires":<unix>}` with HTTP 200.

Save the token for use in subsequent steps.

- [ ] **Step 7: Verify users list works with token**

```bash
curl -s http://localhost:8787/api/cmd/users \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_6>"
```
Expected: `{"users":[...]}` with HTTP 200.

- [ ] **Step 8: Commit**

```bash
git add worker/src/controllers/CommandController.ts worker/src/index.ts
git commit -m "feat: add CMD auth, users list, and serverstatus list endpoints"
```

---

## Task 3: CommandController — Account Management Commands

**Files:**
- Modify: `worker/src/controllers/CommandController.ts`

Add these methods to the `CommandController` class (before the closing `}`):

- [ ] **Step 1: Add `resetIp` method**

```typescript
  // ── PATCH /api/cmd/users/:id/reset-ip ──────────────────────────────────
  static async resetIp(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username, ip FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string; ip: string | null }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);
    if (!user.ip) return err('IP-Sperre bereits zurückgesetzt', 400, origin);

    await env.DATABASE.prepare('UPDATE users SET ip = NULL WHERE id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_RESET_IP', 'users', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `IP-Sperre von ${user.username} aufgehoben.` }, 200, origin);
  }
```

- [ ] **Step 2: Add `setRole` method**

```typescript
  // ── PATCH /api/cmd/users/:id/role ──────────────────────────────────────
  static async setRole(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { role } = body;
    const allowedRoles = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
    if (!role || !allowedRoles.includes(role)) return err('Ungültige Rolle. Erlaubt: OWNER, ADMIN, MOD, TRAINEE', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username, role FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string; role: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
    await auditLog(env.DATABASE, null, 'CMD_SET_ROLE', 'users', String(id), { username: user.username, oldRole: user.role, newRole: role }, getIP(request));

    return json({ success: true, message: `Rolle von ${user.username} auf ${role} gesetzt.` }, 200, origin);
  }
```

- [ ] **Step 3: Add `clearSessions` method**

```typescript
  // ── DELETE /api/cmd/users/:id/sessions ─────────────────────────────────
  static async clearSessions(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_CLEAR_SESSIONS', 'sessions', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `Alle Sitzungen von ${user.username} gelöscht.` }, 200, origin);
  }
```

- [ ] **Step 4: Add `deleteUser` method**

```typescript
  // ── DELETE /api/cmd/users/:id ───────────────────────────────────────────
  static async deleteUser(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return err('Ungültige User-ID', 400, origin);

    const user = await env.DATABASE.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(id).first<{ id: number; username: string }>();
    if (!user) return err('Benutzer nicht gefunden', 404, origin);

    await env.DATABASE.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await auditLog(env.DATABASE, null, 'CMD_DELETE_USER', 'users', String(id), { username: user.username }, getIP(request));

    return json({ success: true, message: `Benutzer ${user.username} gelöscht.` }, 200, origin);
  }
```

- [ ] **Step 5: Register these routes in `worker/src/index.ts`**

Add after the three cmd routes you added in Task 2:

```typescript
  route('PATCH',  '/api/cmd/users/:id/reset-ip', CommandController.resetIp    as UserlessHandler, true),
  route('PATCH',  '/api/cmd/users/:id/role',     CommandController.setRole    as UserlessHandler, true),
  route('DELETE', '/api/cmd/users/:id/sessions', CommandController.clearSessions as UserlessHandler, true),
  route('DELETE', '/api/cmd/users/:id',          CommandController.deleteUser  as UserlessHandler, true),
```

> **Important:** The `/api/cmd/users/:id/sessions` and `/api/cmd/users/:id` routes must appear in this order — more specific before less specific, since the router uses first-match.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Test reset-ip with a valid token**

Get a fresh token (re-auth from Task 2 Step 6), then pick a real user ID from the `/api/cmd/users` response:

```bash
curl -s -X PATCH http://localhost:8787/api/cmd/users/1/reset-ip \
  -H "Authorization: Bearer <TOKEN>"
```
Expected: either `{"success":true,"message":"IP-Sperre von ... aufgehoben."}` or `{"error":"IP-Sperre bereits zurückgesetzt"}`.

- [ ] **Step 8: Commit**

```bash
git add worker/src/controllers/CommandController.ts worker/src/index.ts
git commit -m "feat: add CMD account management endpoints (reset-ip, set-role, clear-sessions, delete-user)"
```

---

## Task 4: CommandController — Game Commands

**Files:**
- Modify: `worker/src/controllers/CommandController.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Add import for `RobloxCloudService` and `DiscordService` at the top of `CommandController.ts`**

The current imports block is:
```typescript
import type { Env } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { verifyTOTP, signSession } from '../utils/totp.js';
import { requireCmdToken } from '../middleware/cmdAuth.js';
```

Replace with:
```typescript
import type { Env } from '../types/index.js';
import { json, err, auditLog, getIP } from '../middleware/auth.js';
import { verifyTOTP, signSession } from '../utils/totp.js';
import { requireCmdToken } from '../middleware/cmdAuth.js';
import { RobloxCloudService } from '../services/RobloxCloudService.js';
import { DiscordService } from '../services/DiscordService.js';
```

- [ ] **Step 2: Add `kick` method**

```typescript
  // ── POST /api/cmd/cloud/kick ────────────────────────────────────────────
  static async kick(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId, reason } = body;
    if (!robloxId || !reason) return err('robloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'KICK',
        targetId: Number(robloxId),
        reason:   reason,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_KICK', 'users', String(robloxId), { reason }, getIP(request));
      return json({ success: true, message: `Kick-Signal für ${robloxId} gesendet.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
```

- [ ] **Step 3: Add `ban` method**

```typescript
  // ── POST /api/cmd/cloud/ban ─────────────────────────────────────────────
  static async ban(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId, reason } = body;
    if (!robloxId || !reason) return err('robloxId und reason sind Pflichtfelder', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.banUser({ userId: Number(robloxId), reason, displayReason: reason, duration: null });
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'KICK',
        targetId: Number(robloxId),
        reason:   `[GEBANNT] ${reason}`,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_BAN', 'users', String(robloxId), { reason }, getIP(request));
      return json({ success: true, message: `${robloxId} wurde gesperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
```

- [ ] **Step 4: Add `unban` method**

```typescript
  // ── POST /api/cmd/cloud/unban ───────────────────────────────────────────
  static async unban(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { robloxId } = body;
    if (!robloxId) return err('robloxId ist ein Pflichtfeld', 400, origin);
    if (isNaN(Number(robloxId)) || Number(robloxId) <= 0) return err('Ungültige Roblox-ID', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.unbanUser(Number(robloxId));
      await auditLog(env.DATABASE, null, 'CMD_UNBAN', 'users', String(robloxId), {}, getIP(request));
      return json({ success: true, message: `${robloxId} wurde entsperrt.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
```

- [ ] **Step 5: Add `shutdownServer` method**

```typescript
  // ── POST /api/cmd/cloud/shutdown ────────────────────────────────────────
  static async shutdownServer(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { serverJobId } = body;
    if (!serverJobId || typeof serverJobId !== 'string') return err('serverJobId ist ein Pflichtfeld', 400, origin);

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:     'SHUTDOWN_SERVER',
        jobId:    serverJobId,
        issuedBy: 'CMD-TERMINAL',
        issuedAt: new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_SHUTDOWN_SERVER', 'servers', serverJobId, {}, getIP(request));
      return json({ success: true, message: `Shutdown-Signal an ${serverJobId.slice(0, 8)}... gesendet.` }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
```

- [ ] **Step 6: Add `restartAll` method**

```typescript
  // ── POST /api/cmd/cloud/restart-all ────────────────────────────────────
  static async restartAll(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    try {
      const cloud = new RobloxCloudService(env);
      await cloud.publishMessage('StaffPanelUpdates', {
        type:          'RESTART_ALL',
        excludeJobIds: [],
        issuedBy:      'CMD-TERMINAL',
        issuedAt:      new Date().toISOString(),
      });
      await auditLog(env.DATABASE, null, 'CMD_RESTART_ALL', 'servers', undefined, {}, getIP(request));
      return json({ success: true, message: 'Restart-Signal an alle Server gesendet.' }, 200, origin);
    } catch (e) {
      return err((e as Error).message, 503, origin);
    }
  }
```

- [ ] **Step 7: Register game command routes in `index.ts`**

Append after the account management routes from Task 3:

```typescript
  route('POST', '/api/cmd/cloud/kick',        CommandController.kick          as UserlessHandler, true),
  route('POST', '/api/cmd/cloud/ban',         CommandController.ban           as UserlessHandler, true),
  route('POST', '/api/cmd/cloud/unban',       CommandController.unban         as UserlessHandler, true),
  route('POST', '/api/cmd/cloud/shutdown',    CommandController.shutdownServer as UserlessHandler, true),
  route('POST', '/api/cmd/cloud/restart-all', CommandController.restartAll    as UserlessHandler, true),
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add worker/src/controllers/CommandController.ts worker/src/index.ts
git commit -m "feat: add CMD game command endpoints (kick, ban, unban, shutdown, restart-all)"
```

---

## Task 5: CommandController — System Commands

**Files:**
- Modify: `worker/src/controllers/CommandController.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Add `clearRateLimits` method**

```typescript
  // ── DELETE /api/cmd/rate-limits ─────────────────────────────────────────
  static async clearRateLimits(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    await env.DATABASE.prepare('DELETE FROM rate_limits').run();
    await auditLog(env.DATABASE, null, 'CMD_CLEAR_RATE_LIMITS', 'system', undefined, {}, getIP(request));
    return json({ success: true, message: 'Rate-Limits gelöscht.' }, 200, origin);
  }
```

- [ ] **Step 2: Add `setServerStatus` method**

```typescript
  // ── PATCH /api/cmd/db/serverstatus/:service ────────────────────────────
  static async setServerStatus(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const service = decodeURIComponent(params.service);
    if (!service) return err('service fehlt', 400, origin);

    const body: any = await request.json().catch(() => ({}));
    const { status } = body;
    if (!status || typeof status !== 'string') return err('status ist ein Pflichtfeld', 400, origin);

    const existing = await env.DATABASE.prepare(
      'SELECT id FROM server_status WHERE service = ?'
    ).bind(service).first<{ id: number }>();

    if (existing) {
      await env.DATABASE.prepare(
        "UPDATE server_status SET status = ?, updated_at = datetime('now') WHERE service = ?"
      ).bind(status, service).run();
    } else {
      await env.DATABASE.prepare(
        "INSERT INTO server_status (service, status) VALUES (?, ?)"
      ).bind(service, status).run();
    }

    await auditLog(env.DATABASE, null, 'CMD_SET_SERVER_STATUS', 'server_status', service, { status }, getIP(request));
    return json({ success: true, message: `${service}: ${status}` }, 200, origin);
  }
```

- [ ] **Step 3: Add `announce` method**

```typescript
  // ── POST /api/cmd/discord/announce ─────────────────────────────────────
  static async announce(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? 'https://bwrp.net';
    const bad = await requireCmdToken(request, env);
    if (bad) return bad;

    const body: any = await request.json().catch(() => ({}));
    const { message } = body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return err('message ist ein Pflichtfeld', 400, origin);
    }

    await new DiscordService(env).sendMonitoringAlert('CMD Terminal', message.trim());
    await auditLog(env.DATABASE, null, 'CMD_ANNOUNCE', 'system', undefined, { message: message.trim() }, getIP(request));
    return json({ success: true, message: 'Ankündigung gesendet.' }, 200, origin);
  }
```

- [ ] **Step 4: Register system command routes in `index.ts`**

Append after the game command routes from Task 4:

```typescript
  route('DELETE', '/api/cmd/rate-limits',               CommandController.clearRateLimits as UserlessHandler, true),
  route('PATCH',  '/api/cmd/db/serverstatus/:service',  CommandController.setServerStatus as UserlessHandler, true),
  route('POST',   '/api/cmd/discord/announce',          CommandController.announce        as UserlessHandler, true),
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Test `clear ratelimits`**

Get a fresh token, then:
```bash
curl -s -X DELETE http://localhost:8787/api/cmd/rate-limits \
  -H "Authorization: Bearer <TOKEN>"
```
Expected: `{"success":true,"message":"Rate-Limits gelöscht."}`.

- [ ] **Step 7: Commit**

```bash
git add worker/src/controllers/CommandController.ts worker/src/index.ts
git commit -m "feat: add CMD system command endpoints (clear-ratelimits, serverstatus, announce)"
```

---

## Task 6: Deploy Worker

- [ ] **Step 1: Deploy to production**

From `worker/`:
```bash
npx wrangler deploy
```
Expected: `Deployed bwrpauth ... (https://bwrpauth.<subdomain>.workers.dev)` with no errors.

- [ ] **Step 2: Smoke-test auth against production**

```bash
curl -s -X POST https://bwrp.net/api/cmd/auth \
  -H "Content-Type: application/json" \
  -d '{"code":"000000"}'
```
Expected: `{"error":"Falscher Code"}` — confirms the route is live.

- [ ] **Step 3: Commit (if any wrangler-generated files changed)**

```bash
git status
# If worker/.wrangler/ has changes, they are gitignored — nothing to commit.
```

---

## Task 7: Frontend — Overlay Shell, TOTP Flow, Session Management

**Files:**
- Create: `assets/js/cmd-terminal.js`

- [ ] **Step 1: Create the file with the core IIFE, state, and DOM injection**

```javascript
/* assets/js/cmd-terminal.js
 * Command Terminal — self-contained, no dependencies.
 * Ctrl+K to open. TOTP auth → 2-min session → command input.
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787/api'
    : 'https://bwrp.net/api';
  const SESSION_TTL = 120;

  // ── State ────────────────────────────────────────────────────────────────
  let session = null;   // { token, expiresUnix, accounts, services } | null
  let timerInterval = null;
  let selectedIdx = -1;
  let currentSuggestions = [];

  // ── DOM Injection ────────────────────────────────────────────────────────
  const STYLES = `
    #cmd-overlay {
      display: none; position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      align-items: flex-start; justify-content: center; padding-top: 15vh;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    }
    #cmd-overlay.cmd-open { display: flex; }
    #cmd-card {
      background: #111114; border: 1px solid #252529; width: 620px; max-width: 95vw;
    }
    #cmd-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 14px; border-bottom: 1px solid #252529;
      font-size: 9px; letter-spacing: .15em; color: #71717a;
    }
    #cmd-header span { color: #e2a800; }
    #cmd-input-wrap {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-bottom: 1px solid #1a1a1e;
    }
    #cmd-input-wrap .cmd-prompt { color: #e2a800; font-size: 13px; user-select: none; }
    #cmd-input, #cmd-totp-input {
      width: 100%; background: transparent; border: none; outline: none;
      color: #fff; font-family: inherit; font-size: 14px; caret-color: #e2a800;
    }
    #cmd-totp-input { text-align: center; letter-spacing: .4em; font-size: 22px; }
    #cmd-totp-wrap { padding: 24px 20px; }
    #cmd-totp-hint { font-size: 10px; color: #52525b; letter-spacing: .08em; margin-bottom: 14px; }
    #cmd-totp-error { font-size: 10px; color: #ef4444; letter-spacing: .05em; margin-top: 8px; min-height: 16px; }
    #cmd-suggestions { max-height: 280px; overflow-y: auto; }
    .cmd-suggestion {
      display: flex; align-items: baseline; gap: 10px;
      padding: 7px 14px; cursor: pointer; border-left: 2px solid transparent;
      font-size: 12px; transition: background .1s;
    }
    .cmd-suggestion:hover, .cmd-suggestion.cmd-selected {
      background: rgba(226,168,0,.06); border-left-color: #e2a800;
    }
    .cmd-sug-text { color: #a1a1aa; flex: 1; }
    .cmd-sug-text .cmd-match { color: #e2a800; }
    .cmd-sug-args { color: #3f3f46; font-size: 11px; }
    .cmd-sug-desc { color: #27272a; font-size: 10px; white-space: nowrap; }
    #cmd-result {
      padding: 8px 14px; font-size: 11px; letter-spacing: .04em;
      border-top: 1px solid #1a1a1e; min-height: 28px; display: none;
    }
    #cmd-result.cmd-ok  { color: #4ade80; display: block; }
    #cmd-result.cmd-err { color: #f87171; display: block; }
    #cmd-timer { font-size: 11px; color: #e2a800; letter-spacing: .06em; }
    #cmd-timer.cmd-warn { color: #f97316; }
    #cmd-timer.cmd-crit { color: #ef4444; }
  `;

  function injectDOM() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'cmd-overlay';
    overlay.innerHTML = `
      <div id="cmd-card">
        <div id="cmd-header">
          <span>KOMMANDO TERMINAL</span>
          <span id="cmd-timer" style="display:none"></span>
        </div>

        <!-- TOTP view -->
        <div id="cmd-totp-view">
          <div id="cmd-totp-wrap">
            <div id="cmd-totp-hint">AUTHENTICATOR-CODE EINGEBEN</div>
            <input id="cmd-totp-input" type="text" maxlength="6"
                   placeholder="000000" inputmode="numeric" autocomplete="one-time-code">
            <div id="cmd-totp-error"></div>
          </div>
        </div>

        <!-- Command view -->
        <div id="cmd-command-view" style="display:none">
          <div id="cmd-input-wrap">
            <span class="cmd-prompt">›</span>
            <input id="cmd-input" type="text" placeholder="Befehl eingeben..." autocomplete="off" spellcheck="false">
          </div>
          <div id="cmd-suggestions"></div>
          <div id="cmd-result"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }

  // ── Session helpers ──────────────────────────────────────────────────────
  function sessionValid() {
    return session && Math.floor(Date.now() / 1000) < session.expiresUnix;
  }

  function clearSession() {
    session = null;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── Open / Close ─────────────────────────────────────────────────────────
  function openOverlay() {
    const overlay = document.getElementById('cmd-overlay');
    overlay.classList.add('cmd-open');

    if (sessionValid()) {
      showCommandView();
    } else {
      clearSession();
      showTotpView();
    }
  }

  function closeOverlay() {
    document.getElementById('cmd-overlay').classList.remove('cmd-open');
  }

  function showTotpView() {
    document.getElementById('cmd-totp-view').style.display = '';
    document.getElementById('cmd-command-view').style.display = 'none';
    document.getElementById('cmd-timer').style.display = 'none';
    document.getElementById('cmd-totp-error').textContent = '';
    const input = document.getElementById('cmd-totp-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }

  function showCommandView() {
    document.getElementById('cmd-totp-view').style.display = 'none';
    document.getElementById('cmd-command-view').style.display = '';
    document.getElementById('cmd-timer').style.display = '';
    document.getElementById('cmd-result').className = '';
    document.getElementById('cmd-result').textContent = '';
    const input = document.getElementById('cmd-input');
    input.value = '';
    renderSuggestions('');
    setTimeout(() => input.focus(), 50);
    startTimer();
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!session) { clearInterval(timerInterval); return; }
      const left = Math.max(0, session.expiresUnix - Math.floor(Date.now() / 1000));
      const m = Math.floor(left / 60);
      const s = left % 60;
      const el = document.getElementById('cmd-timer');
      if (el) {
        el.textContent = m + ':' + String(s).padStart(2, '0');
        el.className = left < 30 ? 'cmd-crit' : left < 60 ? 'cmd-warn' : 'cmd-timer';
      }
      if (left <= 0) {
        clearSession();
        closeOverlay();
      }
    }, 1000);
  }

  // ── TOTP Authentication ──────────────────────────────────────────────────
  async function authenticate(code) {
    const errEl = document.getElementById('cmd-totp-error');
    errEl.textContent = 'VERIFIZIERUNG...';

    try {
      const res = await fetch(`${API_BASE}/cmd/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || 'Fehler';
        document.getElementById('cmd-totp-input').value = '';
        document.getElementById('cmd-totp-input').focus();
        return;
      }

      // Fetch autocomplete data in parallel
      const [usersRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE}/cmd/users`, { headers: { 'Authorization': `Bearer ${data.token}` } }),
        fetch(`${API_BASE}/cmd/serverstatus`, { headers: { 'Authorization': `Bearer ${data.token}` } }),
      ]);
      const usersData    = usersRes.ok    ? await usersRes.json()    : { users: [] };
      const servicesData = servicesRes.ok ? await servicesRes.json() : { services: [] };

      session = {
        token:       data.token,
        expiresUnix: data.expires,
        accounts:    usersData.users    || [],
        services:    servicesData.services || [],
      };

      showCommandView();
    } catch (e) {
      errEl.textContent = 'Netzwerkfehler';
      document.getElementById('cmd-totp-input').focus();
    }
  }

  // ── Keyboard Wiring ──────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const overlay = document.getElementById('cmd-overlay');
      if (overlay.classList.contains('cmd-open')) {
        closeOverlay();
      } else {
        openOverlay();
      }
      return;
    }
    if (e.key === 'Escape') {
      closeOverlay();
    }
  });

  // ── TOTP input listener ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    injectDOM();

    document.getElementById('cmd-totp-input').addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = val;
      if (val.length === 6) authenticate(val);
    });
  });

  // ── Placeholder stubs (filled in Tasks 8 & 9) ───────────────────────────
  function renderSuggestions(input) { /* Task 8 */ }
  async function executeCommand(input) { /* Task 9 */ }

})();
```

- [ ] **Step 2: Add script tag to `dbpanel.html`**

Find the closing `</body>` tag in `dbpanel.html` and add the script just before it:

```html
<script src="/assets/js/cmd-terminal.js"></script>
```

- [ ] **Step 3: Open `dbpanel.html` in a browser and test**

- Press `Ctrl+K` → TOTP overlay should appear with a 6-digit input.
- Type a wrong code manually (6 digits) → "Falscher Code" error should appear.
- Press `Escape` → overlay should close.
- Press `Ctrl+K` again → overlay should reopen.

- [ ] **Step 4: Commit**

```bash
git add assets/js/cmd-terminal.js dbpanel.html
git commit -m "feat: add cmd-terminal overlay shell with TOTP auth flow"
```

---

## Task 8: Frontend — Command Registry and Autocomplete Engine

**Files:**
- Modify: `assets/js/cmd-terminal.js`

Replace the `renderSuggestions` stub and add the command registry and autocomplete logic. Locate `// ── Placeholder stubs` and replace everything from that comment to the end (before the closing `})();`) with the following:

- [ ] **Step 1: Add command registry and autocomplete helpers**

```javascript
  // ── Autocomplete Data ────────────────────────────────────────────────────
  const ROLES    = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
  const STATUSES = ['OPERATIONAL', 'ONLINE', 'SYNCED', 'OFFLINE', 'DEGRADED'];

  function getArgSource(source) {
    if (!source || !session) return null;
    switch (source) {
      case 'accounts': return (session.accounts || []).map(a => a.username);
      case 'roles':    return ROLES;
      case 'statuses': return STATUSES;
      case 'services': return session.services || [];
      default:         return null;
    }
  }

  function resolveAccount(name) {
    if (!session || !name) return null;
    return (session.accounts || []).find(a =>
      a.username.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  // ── Command Registry ─────────────────────────────────────────────────────
  const COMMANDS = [
    {
      id: 'reset-ipaccess',
      tokens: ['reset', 'ipaccess'],
      args: [{ name: 'username', source: 'accounts' }],
      desc: 'Clear IP lock for account',
    },
    {
      id: 'set-role',
      tokens: ['set', 'role'],
      args: [{ name: 'username', source: 'accounts' }, { name: 'role', source: 'roles' }],
      desc: 'Change user role',
    },
    {
      id: 'clear-sessions',
      tokens: ['clear', 'sessions'],
      args: [{ name: 'username', source: 'accounts' }],
      desc: 'Delete all sessions for user',
    },
    {
      id: 'delete-user',
      tokens: ['delete', 'user'],
      args: [{ name: 'username', source: 'accounts' }],
      desc: 'Remove user from DB',
    },
    {
      id: 'kick-player',
      tokens: ['kick', 'player'],
      args: [{ name: 'robloxId', source: null }, { name: 'reason...', source: null }],
      desc: 'Kick player from game',
    },
    {
      id: 'ban-player',
      tokens: ['ban', 'player'],
      args: [{ name: 'robloxId', source: null }, { name: 'reason...', source: null }],
      desc: 'Ban player from game',
    },
    {
      id: 'unban-player',
      tokens: ['unban', 'player'],
      args: [{ name: 'robloxId', source: null }],
      desc: 'Remove game ban',
    },
    {
      id: 'shutdown-server',
      tokens: ['shutdown', 'server'],
      args: [{ name: 'serverJobId', source: null }],
      desc: 'Shutdown specific server (Job ID)',
    },
    {
      id: 'restart-servers',
      tokens: ['restart', 'servers'],
      args: [],
      desc: 'Restart all game servers',
    },
    {
      id: 'clear-ratelimits',
      tokens: ['clear', 'ratelimits'],
      args: [],
      desc: 'Wipe all rate limit entries',
    },
    {
      id: 'set-serverstatus',
      tokens: ['set', 'serverstatus'],
      args: [{ name: 'service', source: 'services' }, { name: 'status', source: 'statuses' }],
      desc: 'Update server status display',
    },
    {
      id: 'announce',
      tokens: ['announce'],
      args: [{ name: 'message...', source: null }],
      desc: 'Post to Discord monitoring webhook',
    },
  ];

  // ── Input Parsing ────────────────────────────────────────────────────────
  /**
   * Given the current raw input string, compute autocomplete suggestions.
   * Returns an array of suggestion objects.
   */
  function getSuggestions(raw) {
    const hasTrailing = raw.length > 0 && raw[raw.length - 1] === ' ';
    const parts = raw.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      // Empty input → show all commands
      return COMMANDS.map(cmd => ({
        type: 'command', cmd,
        displayCommand: cmd.tokens.join(' '),
        displayArgs: cmd.args.map(a => `<${a.name}>`).join(' '),
        matchLen: 0,
      }));
    }

    // Try to find a fully committed command (all tokens matched + either has trailing space or has extra parts)
    for (const cmd of COMMANDS) {
      const n = cmd.tokens.length;
      if (parts.length < n) continue;

      // All n command tokens must match exactly (case-insensitive)
      const allMatch = cmd.tokens.every((t, i) => t === (parts[i] || '').toLowerCase());
      if (!allMatch) continue;

      // Command is fully typed when: parts has more than n tokens, OR parts has exactly n and there's trailing space
      const cmdFullyTyped = parts.length > n || (parts.length === n && hasTrailing);
      if (!cmdFullyTyped) continue;

      // We're now in argument mode for this command
      const argParts = parts.slice(n); // tokens after the command
      // argIdx: which arg are we currently filling?
      const argIdx = hasTrailing ? argParts.length : Math.max(0, argParts.length - 1);
      const currentArg = cmd.args[argIdx];

      if (!currentArg) return []; // all args provided, command is ready to execute

      const partial = hasTrailing ? '' : (argParts[argIdx] || '');
      const source = getArgSource(currentArg.source);
      const fixedArgParts = hasTrailing ? argParts : argParts.slice(0, argIdx);

      if (!source) {
        // Free-text arg — show the placeholder only
        return [{
          type: 'placeholder', cmd, argIdx,
          displayCommand: [...cmd.tokens, ...fixedArgParts].join(' '),
          displayArgs: `<${currentArg.name}>`,
          matchLen: 0,
        }];
      }

      // Filterable arg — show matching values
      const filtered = source.filter(v =>
        !partial || v.toLowerCase().startsWith(partial.toLowerCase())
      );
      return filtered.map(v => ({
        type: 'value', cmd, argIdx, value: v,
        displayCommand: [...cmd.tokens, ...fixedArgParts, v].join(' '),
        displayArgs: cmd.args.slice(argIdx + 1).map(a => `<${a.name}>`).join(' '),
        matchLen: [...cmd.tokens, ...fixedArgParts].join(' ').length + 1,
        partial,
      }));
    }

    // Command still being typed — filter commands by prefix
    const inputLower = raw.trim().toLowerCase();
    return COMMANDS
      .filter(cmd => cmd.tokens.join(' ').startsWith(inputLower))
      .map(cmd => ({
        type: 'command', cmd,
        displayCommand: cmd.tokens.join(' '),
        displayArgs: cmd.args.map(a => `<${a.name}>`).join(' '),
        matchLen: inputLower.length,
      }));
  }

  // ── Suggestion Rendering ─────────────────────────────────────────────────
  function highlight(text, matchLen) {
    if (!matchLen) return `<span class="cmd-match">${escHtml(text)}</span>`;
    const matched = text.slice(0, matchLen);
    const rest    = text.slice(matchLen);
    return `<span class="cmd-match">${escHtml(matched)}</span>${escHtml(rest)}`;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderSuggestions(raw) {
    currentSuggestions = getSuggestions(raw);
    selectedIdx = -1;
    const container = document.getElementById('cmd-suggestions');
    if (!container) return;

    if (!currentSuggestions.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = currentSuggestions.slice(0, 8).map((sug, i) => `
      <div class="cmd-suggestion" data-idx="${i}">
        <span class="cmd-sug-text">${highlight(sug.displayCommand, sug.matchLen)}</span>
        ${sug.displayArgs ? `<span class="cmd-sug-args">${escHtml(sug.displayArgs)}</span>` : ''}
        <span class="cmd-sug-desc">${escHtml(sug.cmd.desc)}</span>
      </div>
    `).join('');

    container.querySelectorAll('.cmd-suggestion').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx);
        selectSuggestion(idx);
      });
    });
  }

  function selectSuggestion(idx) {
    const sug = currentSuggestions[idx];
    if (!sug) return;
    const input = document.getElementById('cmd-input');

    if (sug.type === 'command') {
      input.value = sug.cmd.tokens.join(' ') + (sug.cmd.args.length ? ' ' : '');
    } else if (sug.type === 'value') {
      input.value = sug.displayCommand + ' ';
    } else if (sug.type === 'placeholder') {
      // Don't autocomplete free-text args
      return;
    }

    renderSuggestions(input.value);
    input.focus();
  }

  // ── Command Input Listeners ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // (injectDOM is already called in previous listener registration above)

    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('input', (e) => {
      renderSuggestions(e.target.value);
      clearResult();
    });

    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, Math.min(currentSuggestions.length, 8) - 1);
        updateSelectedHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, -1);
        updateSelectedHighlight();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedIdx >= 0) {
          selectSuggestion(selectedIdx);
        } else if (currentSuggestions.length > 0) {
          selectSuggestion(0);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIdx >= 0 && currentSuggestions[selectedIdx]?.type !== 'placeholder') {
          selectSuggestion(selectedIdx);
        } else {
          executeCommand(e.target.value.trim());
        }
      }
    });
  });

  function updateSelectedHighlight() {
    document.querySelectorAll('.cmd-suggestion').forEach((el, i) => {
      el.classList.toggle('cmd-selected', i === selectedIdx);
    });
  }

  function clearResult() {
    const r = document.getElementById('cmd-result');
    if (r) { r.className = ''; r.textContent = ''; }
  }

  // ── Placeholder stubs (filled in Task 9) ─────────────────────────────────
  async function executeCommand(input) { /* Task 9 */ }
```

- [ ] **Step 2: Open `dbpanel.html`, press Ctrl+K and authenticate with TOTP**

- After auth, the command input should appear.
- Typing `reset` should show `reset ipaccess` and `restart servers` in the list with amber highlight.
- Typing `reset ipaccess ` (with trailing space) should show staff account names.
- Arrow keys should navigate the list, Tab should autocomplete.

- [ ] **Step 3: Commit**

```bash
git add assets/js/cmd-terminal.js
git commit -m "feat: add cmd-terminal command registry and autocomplete engine"
```

---

## Task 9: Frontend — Command Execution, Results, and Countdown Timer

**Files:**
- Modify: `assets/js/cmd-terminal.js`

Replace the `async function executeCommand(input) { /* Task 9 */ }` stub with the full implementation.

- [ ] **Step 1: Add the `cmdFetch` helper and command execute implementations**

```javascript
  // ── API Helper ───────────────────────────────────────────────────────────
  async function cmdFetch(method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
    };
    if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res  = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, message: data.message || data.error || JSON.stringify(data) };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }

  // ── Command Executors ────────────────────────────────────────────────────
  const EXECUTORS = {
    'reset-ipaccess': async (argParts) => {
      const user = resolveAccount(argParts[0]);
      if (!user) return { ok: false, message: `Benutzer "${argParts[0] || '?'}" nicht gefunden.` };
      return cmdFetch('PATCH', `/cmd/users/${user.id}/reset-ip`, null);
    },
    'set-role': async (argParts) => {
      const user = resolveAccount(argParts[0]);
      if (!user) return { ok: false, message: `Benutzer "${argParts[0] || '?'}" nicht gefunden.` };
      const role = (argParts[1] || '').toUpperCase();
      if (!ROLES.includes(role)) return { ok: false, message: `Ungültige Rolle. Erlaubt: ${ROLES.join(', ')}` };
      return cmdFetch('PATCH', `/cmd/users/${user.id}/role`, { role });
    },
    'clear-sessions': async (argParts) => {
      const user = resolveAccount(argParts[0]);
      if (!user) return { ok: false, message: `Benutzer "${argParts[0] || '?'}" nicht gefunden.` };
      return cmdFetch('DELETE', `/cmd/users/${user.id}/sessions`, null);
    },
    'delete-user': async (argParts) => {
      const user = resolveAccount(argParts[0]);
      if (!user) return { ok: false, message: `Benutzer "${argParts[0] || '?'}" nicht gefunden.` };
      return cmdFetch('DELETE', `/cmd/users/${user.id}`, null);
    },
    'kick-player': async (argParts) => {
      const robloxId = argParts[0];
      const reason   = argParts.slice(1).join(' ') || 'Admin kick';
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/kick', { robloxId, reason });
    },
    'ban-player': async (argParts) => {
      const robloxId = argParts[0];
      const reason   = argParts.slice(1).join(' ') || 'Admin ban';
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/ban', { robloxId, reason });
    },
    'unban-player': async (argParts) => {
      const robloxId = argParts[0];
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/unban', { robloxId });
    },
    'shutdown-server': async (argParts) => {
      const serverJobId = argParts[0];
      if (!serverJobId) return { ok: false, message: 'serverJobId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/shutdown', { serverJobId });
    },
    'restart-servers': async () => {
      return cmdFetch('POST', '/cmd/cloud/restart-all', {});
    },
    'clear-ratelimits': async () => {
      return cmdFetch('DELETE', '/cmd/rate-limits', null);
    },
    'set-serverstatus': async (argParts) => {
      const service = argParts[0];
      const status  = (argParts[1] || '').toUpperCase();
      if (!service) return { ok: false, message: 'service fehlt.' };
      if (!status)  return { ok: false, message: 'status fehlt.' };
      return cmdFetch('PATCH', `/cmd/db/serverstatus/${encodeURIComponent(service)}`, { status });
    },
    'announce': async (argParts) => {
      const message = argParts.join(' ');
      if (!message) return { ok: false, message: 'message fehlt.' };
      return cmdFetch('POST', '/cmd/discord/announce', { message });
    },
  };

  // ── Execute ──────────────────────────────────────────────────────────────
  async function executeCommand(raw) {
    if (!raw.trim()) return;
    if (!sessionValid()) {
      showResult(false, 'Session abgelaufen — bitte erneut authentifizieren.');
      return;
    }

    const parts = raw.trim().split(/\s+/);

    // Match command
    let matchedCmd = null;
    let argParts   = [];
    for (const cmd of COMMANDS) {
      const n = cmd.tokens.length;
      if (parts.length < n) continue;
      const allMatch = cmd.tokens.every((t, i) => t === (parts[i] || '').toLowerCase());
      if (allMatch) { matchedCmd = cmd; argParts = parts.slice(n); break; }
    }

    if (!matchedCmd) {
      showResult(false, `Unbekannter Befehl: "${parts[0]}"`);
      return;
    }

    const executor = EXECUTORS[matchedCmd.id];
    if (!executor) {
      showResult(false, `Executor für "${matchedCmd.id}" nicht gefunden.`);
      return;
    }

    showResult(null, 'WIRD AUSGEFÜHRT...');
    const result = await executor(argParts);
    showResult(result.ok, result.message);

    if (result.ok) {
      document.getElementById('cmd-input').value = '';
      renderSuggestions('');
    }
  }

  function showResult(ok, message) {
    const el = document.getElementById('cmd-result');
    if (!el) return;
    if (ok === null) {
      el.className = 'cmd-ok';
      el.style.color = '#71717a';
    } else {
      el.className = ok ? 'cmd-ok' : 'cmd-err';
      el.style.color = '';
    }
    el.textContent = message;
  }
```

- [ ] **Step 2: Open `dbpanel.html`, authenticate, and test the full flow**

- Authenticate with TOTP code.
- Type `restart servers` then Enter → should call the endpoint and show green success message.
- Type `reset ipaccess` + Tab to autocomplete a real username → Enter → should reset IP.
- Type `set role` + Tab → pick a user → Tab → pick a role → Enter → should update role.
- Type a bad command → Enter → should show red error "Unbekannter Befehl".
- Wait for 2-minute timer to expire → overlay should close automatically.

- [ ] **Step 3: Commit**

```bash
git add assets/js/cmd-terminal.js
git commit -m "feat: add cmd-terminal command execution and result display"
```

---

## Task 10: Add Script Tag to Remaining Team Panel Pages

**Files:**
- Modify: `dev.html`
- Modify: `studio.html`
- Modify: `team.html`

For each file, find the closing `</body>` tag and add the script immediately before it:

- [ ] **Step 1: Add to `dev.html`**

```html
<script src="/assets/js/cmd-terminal.js"></script>
```

- [ ] **Step 2: Add to `studio.html`**

```html
<script src="/assets/js/cmd-terminal.js"></script>
```

- [ ] **Step 3: Add to `team.html`**

```html
<script src="/assets/js/cmd-terminal.js"></script>
```

- [ ] **Step 4: Verify on each page**

Open each page in a browser, press `Ctrl+K`, and confirm the overlay appears.

- [ ] **Step 5: Deploy worker and commit everything**

From `worker/`:
```bash
npx wrangler deploy
```

Then from the repo root:
```bash
git add dev.html studio.html team.html
git commit -m "feat: wire cmd-terminal to all team panel pages"
```

---

## Self-Review Checklist (completed inline)

- **Spec coverage:** All 14 routes from the spec are implemented (Tasks 2–5). All 12 commands are in the registry (Task 8) with executors (Task 9). Auth flow (Task 7), autocomplete (Task 8), countdown (Tasks 7+9), account + service cache (Task 7), all team panel pages (Tasks 7+10). ✓
- **Placeholders:** No TBDs. All code blocks are complete. ✓
- **Type consistency:** `requireCmdToken` returns `null | Response` and is called with `if (bad) return bad;` consistently across all handlers. `EXECUTORS` keys match `COMMANDS[].id` exactly. `cmdFetch` is called with correct HTTP methods matching route definitions. ✓

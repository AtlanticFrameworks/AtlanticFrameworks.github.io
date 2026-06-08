# Command Terminal — Design Spec
**Date:** 2026-06-08
**Status:** Approved

## Overview

A keyboard-triggered command palette accessible on every team panel page (including the login page). Authenticated by the existing DOCS TOTP secret, granting a 2-minute in-memory session. Provides a full set of sysadmin commands with autocomplete for accounts, roles, and status values.

---

## 1. Auth & Session Flow

- **Trigger:** `Ctrl+K` anywhere on a team panel page
- **Auth step:** A 6-digit TOTP code is sent to `POST /api/cmd/auth` (public endpoint). The worker verifies it against `env.DOCS_TOTP_SECRET` using the existing `verifyTOTP()`. On success, `signSession()` returns a signed HMAC token valid for **120 seconds**, plus `expires_unix`.
- **Session storage:** `{token, expiresUnix}` stored in a module-scoped JS variable only — no localStorage, no cookie.
- **Re-use:** If `Ctrl+K` is pressed while a valid session exists, the auth step is skipped entirely.
- **Expiry:** When 120s elapse, the variable is cleared. The next `Ctrl+K` triggers re-auth.
- **Close:** `Escape` or clicking the backdrop closes the palette without invalidating the session.
- **Command auth:** All command endpoints receive `Authorization: Bearer <token>`. A new `requireCmdToken()` middleware validates it via `verifySession(env.DOCS_TOTP_SECRET, token)` — no new crypto, reuses existing utilities.
- **Audit:** Every executed command is written to `audit_logs` with `action = 'CMD_<name>'`.

---

## 2. Command Set

| Command | Autocomplete args | Free-text args | Action |
|---|---|---|---|
| `reset ipaccess <username>` | `<username>` | — | Clear `users.ip` → NULL |
| `set role <username> <role>` | `<username>`, `<role>` | — | Update user role |
| `clear sessions <username>` | `<username>` | — | Delete all refresh tokens for user |
| `delete user <username>` | `<username>` | — | Remove user from DB |
| `kick player <robloxId> <reason>` | — | `<robloxId>`, `<reason>` | Kick via Open Cloud |
| `ban player <robloxId> <reason>` | — | `<robloxId>`, `<reason>` | Ban via Open Cloud |
| `unban player <robloxId>` | — | `<robloxId>` | Remove game ban |
| `shutdown server <serverId>` | — | `<serverId>` | Shut down specific server |
| `restart servers` | — | — | Restart all game servers |
| `clear ratelimits` | — | — | Wipe rate limit entries from D1 |
| `set serverstatus <service> <status>` | `<service>`, `<status>` | — | Update server status display |
| `announce <message>` | — | `<message>` | Post to Discord monitoring webhook |

**Autocomplete sources:**
- `<username>` — fetched from `/api/cmd/users` on session start, cached in-memory for the session
- `<role>` — static: `OWNER`, `ADMIN`, `MOD`, `TRAINEE`
- `<service>` — fetched from `/api/cmd/serverstatus` on session start (values are dynamic rows in `server_status` table, e.g. `Roblox API`, `Discord Bot`, `Database`), cached for the session
- `<status>` — static suggestions: `OPERATIONAL`, `ONLINE`, `SYNCED`, `OFFLINE`, `DEGRADED` (free-text also accepted)

---

## 3. Backend Architecture

**New file:** `worker/src/controllers/CommandController.ts`

**New middleware:** `requireCmdToken(request, env)` — validates `Authorization: Bearer <token>` using `verifySession(env.DOCS_TOTP_SECRET, token)`. Mirrors `requireAuth()` pattern.

**New routes (added to `index.ts`):**

```
POST   /api/cmd/auth                      public     Verify TOTP → return {token, expires}
GET    /api/cmd/users                     cmd-token  [{id, username, role}] for autocomplete
GET    /api/cmd/serverstatus              cmd-token  [{service}] for autocomplete
PATCH  /api/cmd/users/:id/reset-ip        cmd-token  Clear IP lock
PATCH  /api/cmd/users/:id/role            cmd-token  Set role
DELETE /api/cmd/users/:id/sessions        cmd-token  Clear all sessions for user
DELETE /api/cmd/users/:id                 cmd-token  Delete user
POST   /api/cmd/cloud/kick                cmd-token  Kick player
POST   /api/cmd/cloud/ban                 cmd-token  Ban player
POST   /api/cmd/cloud/unban               cmd-token  Unban player
POST   /api/cmd/cloud/shutdown            cmd-token  Shutdown server
POST   /api/cmd/cloud/restart-all         cmd-token  Restart all servers
DELETE /api/cmd/rate-limits               cmd-token  Clear rate limits
PATCH  /api/cmd/db/serverstatus/:service  cmd-token  Set server status
POST   /api/cmd/discord/announce          cmd-token  Send announcement
```

All DB operations reuse the same queries as existing controllers — no business logic is duplicated. Only the auth guard changes.

---

## 4. Frontend Architecture

**New file:** `assets/js/cmd-terminal.js` — self-contained IIFE, no framework, no external dependencies.

**Included on:** Every team panel page via `<script src="/assets/js/cmd-terminal.js"></script>`.

**State machine:**
```
LOCKED → (Ctrl+K) → AUTHENTICATING → (valid TOTP) → ACTIVE (120s) → LOCKED
                                              ↑
                                   (Ctrl+K while ACTIVE: skip auth)
```

**UI structure:**
```
┌─────────────────────────────────────────────────┐
│ KOMMANDO TERMINAL              [SESSION: 1:47]  │  amber header + countdown
├─────────────────────────────────────────────────┤
│ > reset ipaccess _                              │  monospace input
├─────────────────────────────────────────────────┤
│  reset ipaccess  <username>   Clear IP lock     │  highlighted match (amber)
│  set role        <username>…  Change role       │
│  restart servers              Restart all       │
└─────────────────────────────────────────────────┘
```

**Autocomplete behaviour:**
- Commands filtered by prefix match; matched characters highlighted in amber
- Argument placeholders shown in muted color after the command name
- After full command is typed and Space pressed, the next token triggers value autocomplete
- `Tab` / arrow keys navigate list; `Enter` selects or executes
- Result shown inline below input (green = success, red = error); input clears after execution; palette stays open

**Session cache (fetched immediately after TOTP auth):**
- `/api/cmd/users` → `session.accounts` — staff usernames for `<username>` autocomplete
- `/api/cmd/serverstatus` → `session.services` — service names for `<service>` autocomplete
- Both invalidated when `session` is cleared on expiry

**Visual style:** matches existing tactical aesthetic — `#08080a` background, amber (`#e2a800`) accents, `JetBrains Mono` font, thin border `#252529`, consistent with the docs gate and staff panel.

---

## 5. Pages to Update

Add `<script src="/assets/js/cmd-terminal.js"></script>` to:
- `dbpanel.html`
- The staff login page
- Any other team panel-associated pages

The script is safe to include on any page — it registers the `keydown` listener silently and only activates on `Ctrl+K`.

/**
 * BWRP Roblox OAuth + D1 API Cloudflare Worker
 *
 * DEPLOYMENT STEPS:
 * ==================================================
 * 1. Deploy this worker as before (see original instructions)
 * 2. In Worker Settings → Bindings → D1 Database:
 *    Variable name: DATABASE
 *    Database:      (your D1 database)
 * 3. The tables will be auto-created on first request.
 * ==================================================
 *
 * API ROUTES (all require GET/POST):
 *   GET  /api/status          → Returns server_status rows
 *   GET  /api/activity        → Returns last 20 activity_logs rows
 *   POST /api/activity/log    → Inserts a new activity log
 *                               Body: { user, action, details }
 *   POST /                    → Roblox OAuth handshake (unchanged)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ─── DB BOOTSTRAP ───────────────────────────────────────────────────────────
async function initDB(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS server_status (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT    NOT NULL UNIQUE,
      status  TEXT    NOT NULL DEFAULT 'UNKNOWN',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user       TEXT NOT NULL,
      action     TEXT NOT NULL,
      details    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO server_status (service, status) VALUES
      ('Roblox API',   'OPERATIONAL'),
      ('Discord Bot',  'ONLINE'),
      ('Database',     'SYNCED');
  `);
}

// ─── RESPONSE HELPERS ────────────────────────────────────────────────────────
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── API ROUTES ──────────────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      // Ensure DB is ready
      if (!env.DATABASE) {
        return json({ error: 'D1 binding DATABASE not found. Prüfe die Worker-Einstellungen.' }, 500);
      }
      try {
        await initDB(env.DATABASE);
      } catch (e) {
        return json({ error: 'DB-Initialisierung fehlgeschlagen', details: e.message }, 500);
      }

      // GET /api/status
      if (url.pathname === '/api/status' && request.method === 'GET') {
        const { results } = await env.DATABASE
          .prepare('SELECT service, status, updated_at FROM server_status ORDER BY id ASC')
          .all();
        return json(results);
      }

      // GET /api/activity
      if (url.pathname === '/api/activity' && request.method === 'GET') {
        const { results } = await env.DATABASE
          .prepare('SELECT user, action, details, created_at FROM activity_logs ORDER BY id DESC LIMIT 20')
          .all();
        return json(results);
      }

      // POST /api/activity/log
      if (url.pathname === '/api/activity/log' && request.method === 'POST') {
        let body;
        try { body = await request.json(); }
        catch { return json({ error: 'Ungültiger JSON-Body' }, 400); }

        const { user, action, details } = body;
        if (!user || !action) {
          return json({ error: 'Fehlende Pflichtfelder: user, action' }, 400);
        }
        await env.DATABASE
          .prepare('INSERT INTO activity_logs (user, action, details) VALUES (?, ?, ?)')
          .bind(user, action, details || '')
          .run();
        return json({ success: true });
      }

      // POST /api/status/update  (optional – um Status programmatisch zu setzen)
      if (url.pathname === '/api/status/update' && request.method === 'POST') {
        let body;
        try { body = await request.json(); }
        catch { return json({ error: 'Ungültiger JSON-Body' }, 400); }

        const { service, status } = body;
        if (!service || !status) {
          return json({ error: 'Fehlende Pflichtfelder: service, status' }, 400);
        }
        await env.DATABASE
          .prepare(`INSERT INTO server_status (service, status, updated_at)
                    VALUES (?, ?, datetime('now'))
                    ON CONFLICT(service) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`)
          .bind(service, status)
          .run();
        return json({ success: true });
      }

      return json({ error: 'Route nicht gefunden' }, 404);
    }

    // ── OAUTH ROUTE (POST /) ────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { code, redirect_uri } = body;
    const client_id     = body.client_id || '1185800266267472506';
    const clientSecret  = env.ROBLOX_AUTH_SECRET;

    if (!code)         return json({ error: 'Missing authorization code' }, 400);
    if (!clientSecret) return json({ error: 'Worker missing ROBLOX_AUTH_SECRET environment variable' }, 500);

    // 1. Exchange code for token
    const tokenParams = new URLSearchParams({
      client_id, client_secret: clientSecret,
      grant_type: 'authorization_code',
      code, redirect_uri: redirect_uri || 'https://bwrp.net/team',
    });

    const tokenRes  = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return json({ error: 'Token exchange failed', details: tokenData }, 400);

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userRes  = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    if (!userRes.ok) return json({ error: 'Failed to fetch userinfo', details: userData }, 400);

    // 3. Log login event to D1 (best-effort, don't fail OAuth if DB down)
    if (env.DATABASE) {
      try {
        await initDB(env.DATABASE);
        await env.DATABASE
          .prepare('INSERT INTO activity_logs (user, action, details) VALUES (?, ?, ?)')
          .bind(userData.preferred_username || userData.name, 'Anmeldung', 'Roblox OAuth Login')
          .run();
      } catch(e) { console.warn('Login-Log fehlgeschlagen:', e.message); }
    }

    return json({
      success: true,
      userId:   userData.sub,
      username: userData.preferred_username || userData.name,
      picture:  userData.picture || null,
    });
  },
};

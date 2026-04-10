import type { Env } from '../types/index.js';

export function renderDocs(_env: Env): Response {
    const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BWRP API // Reference</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/x-icon" href="https://media.discordapp.net/attachments/957378235891597365/1491540474031374426/BWRPNeuwebp.png?ex=69d810d0&is=69d6bf50&hm=9926d55732ec01e277859cf487aec47dfc08d1cfd0be6de0808c8eaecf339231&=&format=webp&quality=lossless">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'tac-dark':   '#050505',
                        'tac-panel':  '#0a0a0a',
                        'tac-card':   '#0d0d0d',
                        'tac-border': 'rgba(255,255,255,0.06)',
                        'tac-amber':  '#e2a800',
                        'tac-red':    '#ef4444',
                        'tac-green':  '#10b981',
                        'tac-blue':   '#3b82f6',
                        'tac-purple': '#a855f7',
                        'tac-muted':  '#52525b',
                    },
                    fontFamily: {
                        'sans':    ['Inter', 'sans-serif'],
                        'display': ['Oswald', 'sans-serif'],
                        'mono':    ['JetBrains Mono', 'monospace'],
                    }
                }
            }
        }
    </script>
    <style>
        body { background: #050505; color: #a1a1aa; }

        /* Endpoint cards */
        .ep { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.06); }
        .ep-header { cursor: pointer; user-select: none; transition: background 0.15s; }
        .ep-header:hover { background: rgba(255,255,255,0.03); }
        .ep-body { display: none; border-top: 1px solid rgba(255,255,255,0.06); }
        .ep.open .ep-body { display: block; }
        .ep.open .ep-chevron { transform: rotate(180deg); }
        .ep-chevron { transition: transform 0.2s; }

        /* Method badges */
        .m-get    { color:#10b981; border-color:rgba(16,185,129,.25); background:rgba(16,185,129,.07); }
        .m-post   { color:#3b82f6; border-color:rgba(59,130,246,.25); background:rgba(59,130,246,.07); }
        .m-patch  { color:#e2a800; border-color:rgba(226,168,0,.25);  background:rgba(226,168,0,.07);  }
        .m-delete { color:#ef4444; border-color:rgba(239,68,68,.25);  background:rgba(239,68,68,.07);  }

        /* Auth badges */
        .auth-pub   { color:#10b981; border-color:rgba(16,185,129,.2);  background:rgba(16,185,129,.06); }
        .auth-user  { color:#3b82f6; border-color:rgba(59,130,246,.2);  background:rgba(59,130,246,.06); }
        .auth-mod   { color:#e2a800; border-color:rgba(226,168,0,.2);   background:rgba(226,168,0,.06);  }
        .auth-admin { color:#ef4444; border-color:rgba(239,68,68,.2);   background:rgba(239,68,68,.06);  }

        /* Code blocks */
        pre { background:#000; border:1px solid rgba(255,255,255,0.06); padding:.85rem 1rem; font-size:.72rem; line-height:1.6; overflow-x:auto; border-radius:2px; }

        /* Params / body tables */
        .param-table { width:100%; font-family:'JetBrains Mono',monospace; font-size:.7rem; border-collapse:collapse; }
        .param-table th { color:#52525b; text-transform:uppercase; letter-spacing:.1em; padding:.5rem .75rem; text-align:left; border-bottom:1px solid rgba(255,255,255,0.06); font-weight:500; }
        .param-table td { padding:.5rem .75rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
        .param-table tr:last-child td { border-bottom:none; }
        .param-name { color:#93c5fd; font-weight:600; }
        .param-type { color:#71717a; }
        .param-req  { color:#ef4444; font-weight:700; font-size:.65rem; }
        .param-opt  { color:#3f3f46; font-size:.65rem; }
        .param-desc { color:#a1a1aa; }

        /* Section divider */
        .section-divider { display:flex; align-items:center; gap:1rem; margin-bottom:1.75rem; }
        .section-divider h3 { font-family:'Oswald',sans-serif; font-size:1.25rem; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.1em; white-space:nowrap; }
        .section-divider .line { flex:1; height:1px; background:rgba(255,255,255,0.06); }

        /* Sidebar */
        .nav-link { display:flex; align-items:center; gap:.65rem; padding:.5rem .75rem; font-family:'JetBrains Mono',monospace; font-size:.68rem; color:#52525b; transition:all .15s; border-left:2px solid transparent; text-decoration:none; }
        .nav-link:hover { color:#a1a1aa; }
        .nav-link.active { color:#e2a800; border-left-color:#e2a800; background:rgba(226,168,0,.05); }
        .nav-count { margin-left:auto; background:rgba(255,255,255,.05); color:#3f3f46; font-size:.6rem; padding:.1rem .4rem; border-radius:2px; }
        .nav-link.active .nav-count { background:rgba(226,168,0,.15); color:#e2a800; }

        /* Notes */
        .note { font-family:'JetBrains Mono',monospace; font-size:.7rem; background:rgba(59,130,246,.06); border:1px solid rgba(59,130,246,.15); color:#93c5fd; padding:.6rem .85rem; margin-bottom:1rem; }
        .note-warn { background:rgba(226,168,0,.05); border-color:rgba(226,168,0,.15); color:#fbbf24; }
        .note-danger { background:rgba(239,68,68,.05); border-color:rgba(239,68,68,.15); color:#fca5a5; }

        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1c1c1c; }

        /* Try-it panels */
        .try-panel { margin-top:1rem; border:1px solid rgba(16,185,129,.15); background:rgba(16,185,129,.02); border-radius:4px; overflow:hidden; }
        .try-panel-header { display:flex; align-items:center; gap:.75rem; padding:.65rem 1rem; border-bottom:1px solid rgba(16,185,129,.1); background:rgba(16,185,129,.03); }
        .try-panel-header span { font-family:'JetBrains Mono',monospace; font-size:.62rem; color:#10b981; text-transform:uppercase; letter-spacing:.12em; font-weight:700; }
        .try-input { background:#08080a; border:1px solid #1c1c1c; color:#e4e4e7; font-family:'JetBrains Mono',monospace; font-size:.72rem; padding:.45rem .75rem; outline:none; flex:1; border-radius:2px; transition:border-color .15s; }
        .try-input:focus { border-color:rgba(16,185,129,.4); }
        .try-body-area { width:100%; min-height:100px; background:#000; border:1px solid #1c1c1c; color:#10b981; font-family:'JetBrains Mono',monospace; font-size:.7rem; padding:.75rem; outline:none; margin-top:.5rem; border-radius:2px; resize:vertical; }
        .try-body-area:focus { border-color:rgba(16,185,129,.4); }
        .try-run { background:#10b981; color:#000; font-family:'JetBrains Mono',monospace; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:.45rem 1.25rem; cursor:pointer; transition:all .15s; border-radius:2px; }
        .try-run:hover { background:#34d399; transform:translateY(-1px); }
        .try-run:active { transform:translateY(0); }
        .try-run:disabled { opacity:.4; cursor:not-allowed; background:#1c1c1c; color:#52525b; }
        .try-output { display:none; padding:0; border-top:1px solid rgba(255,255,255,0.04); }
        .try-output pre { margin:0; background:#050505; border:none; border-radius:0; font-size:.68rem; max-height:300px; overflow-y:auto; padding:1rem; }
        .try-status-ok { color:#10b981; font-family:'JetBrains Mono',monospace; font-size:.65rem; font-weight:700; background:rgba(16,185,129,.1); padding:2px 6px; border-radius:2px; }
        .try-status-err { color:#ef4444; font-family:'JetBrains Mono',monospace; font-size:.65rem; font-weight:700; background:rgba(239,68,68,.1); padding:2px 6px; border-radius:2px; }
    </style>
</head>
<body class="flex min-h-screen font-sans">

<!-- ── MOBILE HEADER ───────────────────────────────────────────────── -->
<header class="fixed top-0 inset-x-0 h-14 border-b border-tac-border bg-tac-panel/90 backdrop-blur-md z-[60] flex items-center justify-between px-5 md:hidden">
    <div class="flex items-center gap-2.5">
        <i data-lucide="terminal" class="w-4 h-4 text-tac-amber"></i>
        <span class="font-display font-bold text-white tracking-widest text-base uppercase">API DOCS</span>
    </div>
    <button id="mob-toggle" class="p-1.5 text-tac-muted hover:text-white transition-colors">
        <i data-lucide="menu" class="w-5 h-5"></i>
    </button>
</header>

<!-- ── SIDEBAR ─────────────────────────────────────────────────────── -->
<aside id="sidebar" class="fixed inset-y-0 left-0 w-60 bg-tac-panel border-r border-tac-border flex flex-col z-50 -translate-x-full md:translate-x-0 transition-transform duration-200">
    <!-- Logo -->
    <div class="h-14 flex items-center px-5 border-b border-tac-border gap-2.5 shrink-0">
        <div class="absolute left-0 top-0 h-14 w-0.5 bg-tac-amber"></div>
        <i data-lucide="terminal" class="w-4 h-4 text-tac-amber"></i>
        <span class="font-display text-base font-bold tracking-widest text-white uppercase">BWRP API</span>
    </div>

    <!-- Meta -->
    <div class="px-4 py-3 border-b border-tac-border font-mono text-[10px] space-y-1.5">
        <div class="flex justify-between">
            <span class="text-tac-muted">BASE URL</span>
            <span class="text-tac-amber">https://bwrp.net/api</span>
        </div>
        <div class="flex justify-between">
            <span class="text-tac-muted">AUTH</span>
            <span class="text-zinc-300">HttpOnly Cookies</span>
        </div>
        <div class="flex justify-between">
            <span class="text-tac-muted">STATUS</span>
            <span class="text-tac-green flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-tac-green rounded-full animate-pulse inline-block"></span>ONLINE
            </span>
        </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p class="font-mono text-[9px] text-tac-muted tracking-[.2em] uppercase px-2 pb-2 pt-1">Endpoints</p>
        <a href="#auth"       class="nav-link"><i data-lucide="lock"       class="w-3.5 h-3.5 shrink-0"></i>Authentication<span class="nav-count">3</span></a>
        <a href="#staff"      class="nav-link"><i data-lucide="users"      class="w-3.5 h-3.5 shrink-0"></i>Staff Panel<span class="nav-count">6</span></a>
        <a href="#watchlist"  class="nav-link"><i data-lucide="eye"        class="w-3.5 h-3.5 shrink-0"></i>Watchlist<span class="nav-count">4</span></a>
        <a href="#moderation" class="nav-link"><i data-lucide="gavel"      class="w-3.5 h-3.5 shrink-0"></i>Moderation<span class="nav-count">4</span></a>
        <a href="#shifts"     class="nav-link"><i data-lucide="clock"      class="w-3.5 h-3.5 shrink-0"></i>Shifts<span class="nav-count">5</span></a>
        <a href="#roblox"     class="nav-link"><i data-lucide="database"   class="w-3.5 h-3.5 shrink-0"></i>Roblox Proxy<span class="nav-count">4</span></a>
        <a href="#cloud"      class="nav-link"><i data-lucide="cloud"      class="w-3.5 h-3.5 shrink-0"></i>Open Cloud<span class="nav-count">4</span></a>
        <a href="#mgmt"       class="nav-link"><i data-lucide="shield-check" class="w-3.5 h-3.5 shrink-0"></i>Management<span class="nav-count">4</span></a>
        <a href="#roles"      class="nav-link"><i data-lucide="user-plus"  class="w-3.5 h-3.5 shrink-0"></i>Roles & Perms<span class="nav-count">8</span></a>
        <a href="#notes"      class="nav-link"><i data-lucide="file-text"   class="w-3.5 h-3.5 shrink-0"></i>Staff Notes<span class="nav-count">4</span></a>
        <a href="#maintenance" class="nav-link"><i data-lucide="hammer"     class="w-3.5 h-3.5 shrink-0"></i>Maintenance<span class="nav-count">2</span></a>
        <a href="#discord"    class="nav-link"><i data-lucide="message-square" class="w-3.5 h-3.5 shrink-0"></i>Discord<span class="nav-count">2</span></a>
        <a href="#db"         class="nav-link"><i data-lucide="database"   class="w-3.5 h-3.5 shrink-0"></i>Database<span class="nav-count">13</span></a>

        <p class="font-mono text-[9px] text-tac-muted tracking-[.2em] uppercase px-2 pb-2 pt-4">Reference</p>
        <a href="#auth-model" class="nav-link"><i data-lucide="key-round"  class="w-3.5 h-3.5 shrink-0"></i>Auth Model</a>
        <a href="#errors"     class="nav-link"><i data-lucide="triangle-alert" class="w-3.5 h-3.5 shrink-0"></i>Error Codes</a>
    </nav>

    <!-- Back -->
    <div class="p-3 border-t border-tac-border shrink-0">
        <a href="/team" class="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono text-tac-muted border border-tac-border hover:text-white hover:border-white/10 transition-all uppercase tracking-widest">
            <i data-lucide="arrow-left" class="w-3 h-3"></i>Back to Panel
        </a>
    </div>
</aside>

<!-- ── MAIN ────────────────────────────────────────────────────────── -->
<main class="flex-1 md:ml-60 min-w-0 pt-14 md:pt-0">

    <!-- Top bar -->
    <div class="sticky top-0 z-40 h-14 border-b border-tac-border bg-tac-panel/80 backdrop-blur-md hidden md:flex items-center justify-between px-8">
        <div class="flex items-center gap-5 font-mono text-[10px]">
            <span class="flex items-center gap-1.5 text-tac-green">
                <span class="w-1.5 h-1.5 rounded-full bg-tac-green animate-pulse inline-block"></span>ONLINE
            </span>
            <span class="text-tac-muted">|</span>
            <span class="text-tac-muted">BASE: <span class="text-white">https://bwrp.net/api</span></span>
            <span class="text-zinc-500">|</span>
            <span class="text-tac-amber font-bold">59 ENDPOINTS</span>
        </div>
        <div id="clock" class="font-mono text-[10px] text-tac-muted tabular-nums"></div>
    </div>

    <div class="px-6 md:px-10 py-10 max-w-5xl mx-auto w-full">

        <!-- Page title -->
        <div class="mb-10">
            <h1 class="font-display text-3xl font-bold text-white tracking-wider uppercase mb-1">API Reference</h1>
            <p class="font-mono text-[11px] text-tac-muted">BWRP Staff Panel · Cloudflare Workers · D1 · Roblox OAuth 2.0</p>
        </div>

        <!-- ══ AUTH MODEL ═════════════════════════════════════════════ -->
        <section id="auth-model" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="key-round" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Auth Model</h3>
                <div class="line"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Access Token</p>
                    <p class="text-zinc-300">Cookie: <span class="text-tac-amber">bwrp_access</span></p>
                    <p class="text-tac-muted">HttpOnly · Secure · SameSite=None</p>
                    <p class="text-tac-muted">TTL: <span class="text-white">15 minutes</span></p>
                </div>
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Refresh Token</p>
                    <p class="text-zinc-300">Cookie: <span class="text-tac-amber">bwrp_refresh</span></p>
                    <p class="text-tac-muted">HttpOnly · Secure · SameSite=None</p>
                    <p class="text-tac-muted">TTL: <span class="text-white">7 days</span></p>
                </div>
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Role Hierarchy</p>
                    <p><span class="text-tac-red font-bold">OWNER</span> <span class="text-tac-muted">&gt;</span> <span class="text-tac-red">ADMIN</span> <span class="text-tac-muted">&gt;</span> <span class="text-tac-amber">MOD</span></p>
                    <p class="text-tac-muted">Determined by Roblox group rank</p>
                    <p class="text-tac-muted">Group: <span class="text-white">34246821</span></p>
                </div>
            </div>
            <div class="note">All protected routes require <span class="text-white">credentials: 'include'</span> on the fetch call so the browser sends HttpOnly cookies cross-origin. On 401, call <span class="text-tac-amber">POST /auth/refresh</span> and retry.</div>
        </section>

        <!-- ══ ERRORS ════════════════════════════════════════════════ -->
        <section id="errors" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="triangle-alert" class="w-4 h-4 text-tac-red shrink-0"></i>
                <h3>Error Codes</h3>
                <div class="line"></div>
            </div>
            <div class="bg-tac-card border border-tac-border overflow-hidden">
                <table class="param-table">
                    <thead><tr><th>Status</th><th>When it occurs</th><th>Body</th></tr></thead>
                    <tbody>
                        <tr><td class="text-tac-amber">400</td><td class="param-desc">Missing / invalid request field</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                        <tr><td class="text-tac-amber">401</td><td class="param-desc">Missing or expired access token</td><td class="text-zinc-500">{ "error": "Kein Authentifizierungs-Token" }</td></tr>
                        <tr><td class="text-tac-amber">403</td><td class="param-desc">Authenticated but insufficient role</td><td class="text-zinc-500">{ "error": "Zugriff verweigert. Mindestrang: ..." }</td></tr>
                        <tr><td class="text-tac-amber">404</td><td class="param-desc">Resource not found</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                        <tr><td class="text-tac-red font-bold">429</td><td class="param-desc">Rate limit exceeded — check <code>Retry-After</code> header</td><td class="text-zinc-500">{ "error": "Zu viele Anfragen..." }</td></tr>
                        <tr><td class="text-tac-amber">500</td><td class="param-desc">Internal worker error</td><td class="text-zinc-500">{ "error": "Interner Server-Fehler: ..." }</td></tr>
                        <tr><td class="text-tac-amber">502</td><td class="param-desc">Upstream Roblox API unreachable</td><td class="text-zinc-500">{ "error": "Roblox-API nicht erreichbar" }</td></tr>
                        <tr><td class="text-tac-amber">503</td><td class="param-desc">Open Cloud action failed</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ══ AUTHENTICATION ════════════════════════════════════════ -->
        <section id="auth" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="lock" class="w-4 h-4 text-tac-blue shrink-0"></i>
                <h3>Authentication</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- POST /auth/login -->
                <div class="ep">
                    <div class="ep-header ep p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/login</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Exchange Roblox OAuth code for session cookies</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-5">
                        <p class="font-mono text-[11px] text-zinc-400">Accepts the OAuth authorization code returned by Roblox, exchanges it for tokens, verifies the user's group rank, and sets <span class="text-tac-amber">bwrp_access</span> + <span class="text-tac-amber">bwrp_refresh</span> cookies. Returns 403 if the user has no qualifying rank.</p>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">code</td><td class="param-type">string</td><td class="param-req">YES</td><td class="param-desc">OAuth authorization code from Roblox callback</td></tr>
                                        <tr><td class="param-name">redirect_uri</td><td class="param-type">string</td><td class="param-opt">opt</td><td class="param-desc">Must match the registered redirect URI. Defaults to <code>https://bwrp.net/team</code></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "user": {
    "id": 1,
    "username": "Zane",
    "role": "OWNER",
    "avatarUrl": "https://tr.rbxcdn.com/..."
  }
}</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">Sets: <span class="text-tac-amber">bwrp_access</span> (15 min) · <span class="text-tac-amber">bwrp_refresh</span> (7 days)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /auth/refresh -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/refresh</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Re-issue access token using refresh cookie</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="note">Requires the <span class="text-white">bwrp_refresh</span> HttpOnly cookie. No request body needed. Issues a new <span class="text-white">bwrp_access</span> cookie.</div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Cookies Required</p>
                                <table class="param-table">
                                    <thead><tr><th>Cookie</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">bwrp_refresh</td><td class="param-desc">Must be valid and not expired (7-day TTL)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">Sets: <span class="text-tac-amber">bwrp_access</span> (new 15 min window)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /auth/logout -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/logout</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Invalidate session and clear cookies</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <p class="font-mono text-[11px] text-zinc-400">Deletes the session row from D1 (if refresh cookie is present) and clears both cookies via <code>Max-Age=0</code>. Safe to call even when not logged in.</p>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                            </div>
                            <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            <p class="font-mono text-[9px] text-tac-muted mt-2">Clears: <span class="text-tac-amber">bwrp_access</span> · <span class="text-tac-amber">bwrp_refresh</span></p>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ STAFF PANEL ═══════════════════════════════════════════ -->
        <section id="staff" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="users" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Staff Panel</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /staff/me -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/me</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Own profile from the D1 users table</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "user": {
    "id": 1,
    "username": "Zane",
    "avatar_url": "https://tr.rbxcdn.com/...",
    "role": "OWNER",
    "last_seen": "2026-04-08T12:00:00.000Z",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/me" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/sessions -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/sessions</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All active sessions for the current user</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "sessions": [
    {
      "id": 42,
      "ip": "1.2.3.4",
      "user_agent": "Mozilla/5.0 ...",
      "expires_at": "2026-04-15T12:00:00.000Z",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/sessions" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/roster -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/roster</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All staff members sorted by role then username</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "roster": [
    {
      "id": 1,
      "roblox_id": "123456789",
      "username": "Zane",
      "avatar_url": "https://tr.rbxcdn.com/...",
      "role": "OWNER",
      "last_seen": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/roster" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/status -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/status</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Service status rows from server_status table</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "status": [
    {
      "service": "Game Server",
      "status": "ONLINE",
      "updated_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/status" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/activity -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/activity</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Last 20 audit log entries (all staff)</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "activity": [
    {
      "action": "CASE_CREATE",
      "resource": "cases",
      "resource_id": "INC-0042",
      "created_at": "2026-04-08T12:00:00.000Z",
      "username": "Zane"
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/activity" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/stats -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/stats</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Aggregated lifetime and weekly stats for the caller</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "total_shifts":  42,
  "total_seconds": 151200,
  "total_cases":   130,
  "total_bans":    18,
  "week_seconds":  14400,
  "week_cases":    12,
  "cases_filed":   95
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/stats" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ WATCHLIST ═════════════════════════════════════════════ -->
        <section id="watchlist" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="eye" class="w-4 h-4 text-yellow-500 shrink-0"></i>
                <h3>Watchlist</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /watchlist -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All watchlist entries ordered newest first</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "watchlist": [
    {
      "id": 15,
      "player_roblox_id": "123456789",
      "player_username": "Troublemaker",
      "reason": "Suspected mass RDM",
      "added_by_id": 1,
      "added_by_username": "Zane",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/watchlist" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /watchlist/check/:robloxId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist/check/<span class="text-tac-amber">:robloxId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Check if a specific player is flagged</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">robloxId</td><td class="param-type">string</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "flagged": true,
  "entry": {
    "id": 15,
    "player_roblox_id": "123456789",
    "player_username": "Troublemaker",
    "reason": "Suspected mass RDM",
    "created_at": "2026-04-08T12:00:00.000Z"
  }
}</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2"><code>entry</code> is <span class="text-white">null</span> when <code>flagged: false</code></p>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Roblox User ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/watchlist/check/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- POST /watchlist -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Add a player to the watchlist</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">playerRobloxId</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">playerUsername</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><span class="try-label" style="margin-left:auto"></span><button class="try-run" data-path="/watchlist" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "playerRobloxId": "1", "playerUsername": "Name", "reason": "Text" }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- DELETE /watchlist/:id -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-delete px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">DELETE</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist/<span class="text-tac-amber">:id</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Remove a watchlist entry by its row ID</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">id</td><td class="param-type">integer</td><td class="param-desc">Watchlist row ID (from GET /watchlist)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Watchlist Row ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/watchlist/{v}" data-method="DELETE" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ MODERATION ════════════════════════════════════════════ -->
        <section id="moderation" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="gavel" class="w-4 h-4 text-tac-red shrink-0"></i>
                <h3>Moderation</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /moderation/all -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/all</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Paginated case browser with optional filters</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-5">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Query Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">type</td><td class="param-type">string</td><td class="param-opt">—</td><td class="param-desc">WARN · KICK · BAN · PERMBAN</td></tr>
                                        <tr><td class="param-name">search</td><td class="param-type">string</td><td class="param-opt">—</td><td class="param-desc">Partial match on target_username</td></tr>
                                        <tr><td class="param-name">limit</td><td class="param-type">integer</td><td class="param-opt">50</td><td class="param-desc">Max 100</td></tr>
                                        <tr><td class="param-name">offset</td><td class="param-type">integer</td><td class="param-opt">0</td><td class="param-desc">For pagination</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "cases": [
    {
      "id": 1,
      "incident_id": "INC-0042",
      "target_roblox_id": "123456789",
      "target_username": "Player1",
      "type": "BAN",
      "reason": "Mass RDM",
      "duration_days": 7,
      "moderator_id": 1,
      "moderator_username": "Zane",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Query (e.g. ?type=BAN&search=Zane)" />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/moderation/all{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /moderation/cases/:playerId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases/<span class="text-tac-amber">:playerId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All cases for a specific Roblox user ID</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">playerId</td><td class="param-type">string</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "cases": [ { ... } ] }</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Roblox Player ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/moderation/cases/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- POST /moderation/cases -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Create a new moderation case</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">type</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">evidence</td><td class="param-type">string[]</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">durationDays</td><td class="param-type">integer</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">type: <span class="text-white">WARN · KICK · BAN · PERMBAN</span></p>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "case": { "id": 1, "incident_id": "INC-0042", ... } }</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><span class="try-label" style="margin-left:auto"></span><button class="try-run" data-path="/moderation/cases" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "targetRobloxId": "123", "targetUsername": "Name", "type": "WARN", "reason": "Test" }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- PATCH /moderation/cases/:caseId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-patch px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">PATCH</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases/<span class="text-tac-amber">:caseId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Update notes or evidence on an existing case</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">evidence</td><td class="param-type">string[]</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Case Row ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/moderation/cases/{v}" data-method="PATCH" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "notes": "Updated note content..." }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ SHIFTS ════════════════════════════════════════════════ -->
        <section id="shifts" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="clock" class="w-4 h-4 text-tac-green shrink-0"></i>
                <h3>Shifts</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- POST /shifts/start -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/start</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Begin a new shift — fails if one is already active</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "user_id": 1,
    "status": "ACTIVE",
    "start_time": "2026-04-08T12:00:00.000Z"
  }
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/shifts/start" data-method="POST" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- POST /shifts/end -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/end</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">End the active shift and record metrics</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON) — all optional</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Default</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">cases_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">bans_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">warns_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">kicks_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">null</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "status": "ENDED",
    "duration_seconds": 3600,
    "cases_count": 5,
    "bans_count": 1,
    "end_time": "2026-04-08T13:00:00.000Z"
  }
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/shifts/end" data-method="POST" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "cases_count": 5, "notes": "Great shift!" }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /shifts/active -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/active</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Current active shift for the calling user</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "status": "ACTIVE",
    "start_time": "2026-04-08T12:00:00.000Z"
  }
}
 
// shift is null when no active shift</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/shifts/active" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /shifts/analytics -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/analytics</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Team-wide shift analytics (all staff)</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "analytics": [
    {
      "user_id": 1,
      "username": "Zane",
      "total_shifts": 42,
      "total_seconds": 151200,
      "avg_duration": 3600
    }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/shifts/analytics" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /shifts/all -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/all</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Global shift logs — limited to recent history</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/shifts/all" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ ROBLOX PROXY ══════════════════════════════════════════ -->
        <section id="roblox" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="database" class="w-4 h-4 text-tac-blue shrink-0"></i>
                <h3>Roblox Proxy</h3>
                <div class="line"></div>
            </div>
            <div class="note mb-4">All routes in this section proxy to the Roblox public API. The Worker adds the required <code>User-Agent</code> header. Returns 502 if Roblox is unreachable.</div>
            <div class="space-y-2">

                <!-- GET /roblox/player/:identifier -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/player/<span class="text-tac-amber">:identifier</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Player profile + headshot (username or numeric ID)</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">identifier</td><td class="param-desc">Numeric Roblox ID <em>or</em> exact username. If numeric, skips username resolution.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "id": 1234567,
  "username": "Zane",
  "displayName": "Zane",
  "description": "Bio text here...",
  "created": "2017-03-12T00:00:00.000Z",
  "isBanned": false,
  "avatarUrl": "https://tr.rbxcdn.com/...",
  "profileUrl": "https://www.roblox.com/users/1234567/profile"
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Username or Roblox ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/player/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /roblox/group/roles -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/group/roles</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All roles defined in group 34246821</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200 (Roblox passthrough)</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "groupId": 34246821,
  "roles": [
    { "id": 100, "name": "Guest",  "rank": 1,   "memberCount": 0 },
    { "id": 200, "name": "Member", "rank": 50,  "memberCount": 120 },
    { "id": 300, "name": "Admin",  "rank": 200, "memberCount": 5 }
  ]
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/group/roles" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /roblox/group/roles/:roleId/users -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/group/roles/<span class="text-tac-amber">:roleId</span>/users</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Members of a role with headshot thumbnails</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">roleId</td><td class="param-desc">Roblox group role ID (from /roblox/group/roles)</td></tr>
                                    </tbody>
                                </table>
                                <p class="font-mono text-[9px] text-tac-muted mt-3">Returns up to 100 members. Thumbnails resolved in a single batch call. <code>avatarUrl</code> may be null if the CDN hasn't processed the image yet.</p>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "data": [
    {
      "userId": 1234567,
      "username": "Zane",
      "displayName": "Zane",
      "avatarUrl": "https://tr.rbxcdn.com/..."
    }
  ]
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Role ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/group/roles/{v}/users" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /roblox/servers -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/servers</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Live server list for the configured Place ID</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "servers": [
    {
      "index": 1,
      "jobId": "guid-string",
      "players": 12,
      "maxPlayers": 50,
      "ping": 42,
      "fps": 60
    }
  ],
  "totalPlayers": 12,
  "serverCount": 1
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/servers" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ OPEN CLOUD ════════════════════════════════════════════ -->
        <section id="cloud" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="cloud" class="w-4 h-4 text-purple-400 shrink-0"></i>
                <h3>Open Cloud</h3>
                <div class="line"></div>
            </div>
            <div class="note-warn note mb-4">These routes communicate directly with Roblox Open Cloud and in-game servers via MessagingService. Actions are irreversible and logged to the audit trail.</div>
            <div class="space-y-2">

                <!-- POST /cloud/kick -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/kick</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Publish KICK signal via MessagingService to all servers</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Kick-Signal für Player1 gesendet."
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><span class="try-label" style="margin-left:auto"></span><button class="try-run" data-path="/cloud/kick" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "targetRobloxId": 123, "reason": "Trolling" }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- POST /cloud/ban -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/ban</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Native universe ban via Roblox Open Cloud + kick signal</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">displayReason</td><td class="param-type">string</td><td class="param-opt">opt</td><td class="param-desc">Shown to the player. Defaults to reason.</td></tr>
                                        <tr><td class="param-name">durationDays</td><td class="param-type">integer</td><td class="param-opt">opt</td><td class="param-desc">null = permanent ban</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Player1 wurde gesperrt."
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><span class="try-label" style="margin-left:auto"></span><button class="try-run" data-path="/cloud/ban" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "targetRobloxId": 123, "reason": "Exploiting", "durationDays": 7 }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- POST /cloud/unban -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/unban</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Remove a native universe ban via Open Cloud</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Player1 wurde entsperrt."
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><span class="try-label" style="margin-left:auto"></span><button class="try-run" data-path="/cloud/unban" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4">
                                <textarea class="try-body-area" placeholder='{ "targetRobloxId": 123 }'></textarea>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /cloud/restriction/:userId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/restriction/<span class="text-tac-amber">:userId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Query current ban/restriction state from Open Cloud</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">userId</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200 (Roblox passthrough)</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "path": "universes/6003245325/user-restrictions/123456",
  "gameJoinRestriction": {
    "active": true,
    "startTime": "2026-04-01T00:00:00Z",
    "duration": "P7D",
    "privateReason": "Mass RDM",
    "displayReason": "Rule violation"
  }
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Roblox User ID (numeric)..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/cloud/restriction/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- ══ MANAGEMENT ══════════════════════════════════════════════ -->
        <section id="mgmt" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="shield-check" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Staff Management</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">
                <!-- GET /mgmt/users -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/mgmt/users</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Complete list of all registered staff members</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <pre class="text-tac-green"><code>{ "staff": [ { "id": 1, "username": "...", "role": "OWNER", "hwidLocked": true, "customRoles": [] } ] }</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/mgmt/users" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- GET /mgmt/users/:id/activity -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/mgmt/users/<span class="text-tac-amber">:id</span>/activity</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Detailed dossier of a staff member's actions and stats</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><input class="try-input" placeholder="User D1 ID..." /><button class="try-run" data-path="/mgmt/users/{v}/activity" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- PATCH /mgmt/users/:id/hwid-reset -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-patch px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">PATCH</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/mgmt/users/<span class="text-tac-amber">:id</span>/hwid-reset</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Unlock account for a new hardware ID</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><input class="try-input" placeholder="User D1 ID..." /><button class="try-run" data-path="/mgmt/users/{v}/hwid-reset" data-method="PATCH" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ ROLES & PERMISSIONS ════════════════════════════════════ -->
        <section id="roles" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="user-plus" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Roles & Permissions</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">
                <!-- GET /roles -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roles</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">List all defineable staff roles</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/roles" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- POST /roles/users/:userId/assign -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roles/users/<span class="text-tac-amber">:userId</span>/assign</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Grant a custom role to a staff member</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><input class="try-input" placeholder="User D1 ID..." /><button class="try-run" data-path="/roles/users/{v}/assign" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4"><textarea class="try-body-area" placeholder='{ "roleId": 5 }'></textarea></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ STAFF NOTES ════════════════════════════════════════════ -->
        <section id="notes" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="file-text" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Staff Notes</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">
                <!-- GET /notes -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/notes</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Retrieve your personal scratchpad and pinned tickets</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <pre class="text-tac-green"><code>{ "content": "Text...", "pinnedTickets": [], "updatedAt": "..." }</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/notes" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- PUT /notes -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-patch px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">PUT</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/notes</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Update your personal scratchpad content</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/notes" data-method="PUT" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4"><textarea class="try-body-area" placeholder='{ "content": "New scratchpad text..." }'></textarea></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ MAINTENANCE ════════════════════════════════════════════ -->
        <section id="maintenance" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="hammer" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Server Maintenance</h3>
                <div class="line"></div>
            </div>
            <div class="note-warn note mb-4">Power operations directly impact live game servers. Requires ADMIN+ rank.</div>
            <div class="space-y-2">
                <!-- POST /cloud/servers/shutdown -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/servers/shutdown</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Signal a specific server instance to gracefully shut down</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/cloud/servers/shutdown" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4"><textarea class="try-body-area" placeholder='{ "serverJobId": "guid-here" }'></textarea></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- POST /cloud/servers/restart-all -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/servers/restart-all</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Trigger a rolling restart for all servers except protected ones</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/cloud/servers/restart-all" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4"><textarea class="try-body-area" placeholder='{ "extraProtectedJobIds": [] }'></textarea></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ DISCORD ════════════════════════════════════════════════ -->
        <section id="discord" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="message-square" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Discord</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">
                <!-- POST /discord/announce -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/discord/announce</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Send a rich embed message to a Discord webhook</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/discord/announce" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="px-4 pb-4"><textarea class="try-body-area" placeholder='{ "title": "...", "message": "...", "color": "#hex", "ping": "@everyone" }'></textarea></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- POST /discord/test -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/discord/test</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Validate webhook configuration and endpoint health</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/discord/test" data-method="POST" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ DATABASE PANEL ══════════════════════════════════════════ -->
        <section id="db" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="database" class="w-4 h-4 text-tac-muted shrink-0"></i>
                <h3>Direct Database Access</h3>
                <div class="line"></div>
            </div>
            <div class="note-warn note mb-4">Direct row-level access to D1 tables. Bypasses application logic. Strictly OWNER ONLY.</div>
            <div class="space-y-2">
                <!-- GET /db/stats -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/db/stats</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Database performance metrics and table sizes</span>
                        <span class="auth-owner px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">OWNER</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/db/stats" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- GET /db/audit-logs -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/db/audit-logs</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Global immutable audit trail of all staff actions</span>
                        <span class="auth-owner px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">OWNER</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/db/audit-logs" data-method="GET" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
                <!-- DELETE /db/rate-limits -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-delete px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">DELETE</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/db/rate-limits</code>
                        <span class="font-mono text-[10px] text-zinc-500 flex-1 min-w-0 truncate">Clear all active IP-based rate limit blocks</span>
                        <span class="auth-owner px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">OWNER</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="try-panel">
                            <div class="try-panel-header"><span>Try it</span><button class="try-run" data-path="/db/rate-limits" data-method="DELETE" onclick="tryIt(this)">Run</button></div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="note mt-4 opacity-50">Additional CRUD routes for users, cases, and sessions are available but restricted to direct D1 console patterns.</div>
        </section>

    </div><!-- /content -->

    <footer class="border-t border-tac-border px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-tac-panel/30">
        <div class="font-mono text-[10px] text-tac-muted">
            <span class="text-white font-semibold">BWRP STAFF PANEL</span> · Cloudflare Workers · D1 · Roblox OAuth 2.0
        </div>
        <div class="font-mono text-[10px] text-tac-muted tabular-nums">59 ENDPOINTS · &copy; 2026 ATLANTIC COMMAND</div>
    </footer>

</main><!-- /main -->

<script>
    lucide.createIcons();

    // Clock
    (function tick() {
        const el = document.getElementById('clock');
        if (el) el.textContent = new Date().toISOString().replace('T',' ').slice(0,19) + ' UTC';
        setTimeout(tick, 1000);
    })();

    // Toggle endpoint open/close
    function toggle(card) {
        card.classList.toggle('open');
    }

    // Copy button — finds the nearest <pre> inside the same ep-body
    document.addEventListener('click', async function(e) {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;
        const body = btn.closest('.ep-body');
        if (!body) return;
        const pre = body.querySelector('pre');
        if (!pre) return;
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        try {
            await navigator.clipboard.writeText(code.trim());
            const orig = btn.textContent;
            btn.textContent = 'COPIED!';
            btn.classList.add('text-tac-green');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('text-tac-green'); }, 2000);
        } catch {}
    });

    // Mobile sidebar
    document.getElementById('mob-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('-translate-x-full');
    });
    document.querySelectorAll('.nav-link').forEach(a => {
        a.addEventListener('click', () => {
            if (window.innerWidth < 768) document.getElementById('sidebar')?.classList.add('-translate-x-full');
        });
    });

    // ── Try-it panel logic ────────────────────────────────────────────────────
    const API = location.origin + '/api';

    async function tryIt(btn) {
        const panel     = btn.closest('.try-panel');
        const output    = panel.querySelector('.try-output');
        const statusEl  = panel.querySelector('.try-label');
        const pathInput = panel.querySelector('.try-input');
        const bodyInput = panel.querySelector('.try-body-area');
        
        const template  = btn.dataset.path;
        const method    = btn.dataset.method || 'GET';
        
        // Path segments (/{v}) are required; query strings ({v} not preceded by /) are optional.
        const isPathParam = template.includes('/{v}');
        if (pathInput && !pathInput.value.trim() && isPathParam) {
            showTryResult(output, statusEl, 0, { error: 'Path parameter is required' });
            return;
        }

        let body = null;
        if (bodyInput) {
            try {
                const val = bodyInput.value.trim();
                if (val) body = JSON.stringify(JSON.parse(val));
            } catch (e) {
                showTryResult(output, statusEl, 0, { error: 'Invalid JSON in request body' });
                return;
            }
        }

        const rawVal = pathInput ? pathInput.value.trim() : '';
        // Query strings (starting with '?') must not be percent-encoded; path segments must be.
        // Empty rawVal for optional query param just removes the {v} placeholder.
        const encodedVal = rawVal.startsWith('?') ? rawVal : (rawVal ? encodeURIComponent(rawVal) : '');
        const path = template.includes('{v}') ? template.replace('{v}', encodedVal) : template;

        btn.disabled = true;
        const oldText = btn.textContent;
        btn.textContent = '...';
        
        try {
            const options = { method, credentials: 'include' };
            if (body) {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = body;
            }

            const res = await fetch(API + path, options);
            let responseBody;
            try { 
                responseBody = await res.json(); 
            } catch { 
                responseBody = { raw: await res.text() }; 
            }
            showTryResult(output, statusEl, res.status, responseBody);
        } catch (e) {
            showTryResult(output, statusEl, 0, { error: 'Network Error: ' + e.message });
        } finally {
            btn.disabled = false;
            btn.textContent = oldText;
        }
    }

    function showTryResult(output, statusEl, status, body) {
        if (statusEl) {
            statusEl.textContent = status ? 'HTTP ' + status : 'ERROR';
            statusEl.className = (status >= 200 && status < 300) ? 'try-status-ok' : 'try-status-err';
        }
        output.style.display = 'block';
        const pre = output.querySelector('pre');
        if (pre) pre.textContent = JSON.stringify(body, null, 2);
        output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Enter key in try-it inputs
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        if (e.target.tagName === 'TEXTAREA') return;
        const input = e.target.closest('.try-input');
        if (!input) return;
        const btn = input.closest('.try-panel-header')?.querySelector('.try-run') || 
                    input.closest('.try-panel')?.querySelector('.try-run');
        if (btn) btn.click();
    });

    // Scroll spy
    const spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const id = e.target.getAttribute('id');
                document.querySelectorAll('.nav-link').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
</script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

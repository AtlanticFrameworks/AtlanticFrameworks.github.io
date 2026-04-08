import type { Env } from '../types/index.js';

export function renderDocs(_env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="de" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BWRP API // Tactical Documentation</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Oswald:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'tac-dark': '#050505',
                        'tac-panel': '#0a0a0a',
                        'tac-amber': '#e2a800',
                        'tac-border': 'rgba(255,255,255,0.05)',
                        'tac-red': '#ef4444',
                        'tac-green': '#10b981',
                        'tac-blue': '#3b82f6',
                        'tac-muted': '#64748b',
                    },
                    fontFamily: {
                        'sans': ['Inter', 'sans-serif'],
                        'display': ['Oswald', 'sans-serif'],
                        'mono': ['JetBrains Mono', 'monospace'],
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #050505; color: #cbd5e1; }
        .endpoint-card { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; }
        .endpoint-card:hover { border-color: rgba(255,255,255,0.1); }
        .method-get { color: #10b981; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
        .method-post { color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.05); }
        .method-patch { color: #e2a800; border-color: rgba(226, 168, 0, 0.2); background: rgba(226, 168, 0, 0.05); }
        .method-delete { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); }
        
        pre { background: #000; border-radius: 2px; padding: 1rem; font-size: 0.75rem; overflow-x: auto; border: 1px solid rgba(255,255,255,0.05); position: relative; }
        
        .sidebar-link.active { color: #e2a800; border-left: 2px solid #e2a800; background: rgba(226, 168, 0, 0.05); }
        .clip-both { clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    </style>
</head>
<body class="flex min-h-screen font-sans overflow-x-hidden">

    <!-- Mobile Header -->
    <header class="fixed top-0 left-0 right-0 h-16 border-b border-tac-border bg-tac-panel/80 backdrop-blur-md z-[60] flex items-center justify-between px-6 md:hidden">
        <div class="flex items-center gap-3">
            <i data-lucide="target" class="w-5 h-5 text-tac-amber"></i>
            <h1 class="font-display font-bold text-white tracking-widest text-lg">API DOCS</h1>
        </div>
        <button id="mobile-menu-toggle" class="p-2 text-white">
            <i data-lucide="menu" class="w-6 h-6"></i>
        </button>
    </header>

    <!-- Sidebar -->
    <aside id="sidebar" class="fixed inset-y-0 left-0 w-64 bg-tac-panel border-r border-tac-border flex flex-col z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300">
        <div class="h-16 flex items-center px-6 border-b border-tac-border">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-tac-amber"></div>
            <i data-lucide="target" class="w-6 h-6 text-tac-amber mr-3"></i>
            <h2 class="font-display text-xl font-bold tracking-widest text-white uppercase">KOMMANDO</h2>
        </div>
        
        <div class="p-4 border-b border-tac-border bg-black/20 font-mono text-[10px] space-y-2">
            <div class="flex justify-between">
                <span class="text-tac-muted">API STATUS</span>
                <span class="text-tac-green flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-tac-green rounded-full animate-pulse"></span> READY</span>
            </div>
            <div class="flex justify-between">
                <span class="text-tac-muted">VERSION</span>
                <span class="text-white">v2.1.4-STABLE</span>
            </div>
            <div class="flex justify-between">
                <span class="text-tac-muted">URL</span>
                <span class="text-tac-amber">/api/v2/*</span>
            </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
            <p class="font-mono text-[9px] text-tac-muted tracking-[0.2em] mb-3 mt-4 px-3 uppercase">Verzeichnisse</p>
            <a href="#auth" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="lock" class="w-4 h-4"></i> AUTHENTICATION
            </a>
            <a href="#staff" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="users" class="w-4 h-4"></i> STAFF PANEL
            </a>
            <a href="#watchlist" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="eye" class="w-4 h-4"></i> WATCHLIST
            </a>
            <a href="#moderation" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="gavel" class="w-4 h-4"></i> MODERATION
            </a>
            <a href="#shifts" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="clock" class="w-4 h-4"></i> SHIFT LOGS
            </a>
            <a href="#roblox" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="database" class="w-4 h-4"></i> ROBLOX PROXY
            </a>
            <a href="#cloud" class="sidebar-link flex items-center gap-3 px-3 py-2.5 text-[11px] font-mono transition-all text-tac-muted hover:text-white border-l-2 border-transparent">
                <i data-lucide="cloud" class="w-4 h-4"></i> OPEN CLOUD
            </a>
        </nav>

        <div class="p-4 border-t border-tac-border">
            <a href="/team" class="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono text-tac-muted border border-tac-border hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Zum Panel
            </a>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 md:ml-64 flex flex-col min-w-0 bg-tac-dark relative overflow-y-auto pt-16 md:pt-0">
        
        <!-- Header status bar -->
        <div class="h-16 border-b border-tac-border flex items-center justify-between px-8 bg-tac-panel/30 sticky top-0 backdrop-blur-md z-40 hidden md:flex">
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-2">
                    <span class="flex h-2 w-2 relative">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-tac-green opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-tac-green"></span>
                    </span>
                    <span class="font-mono text-[10px] text-tac-green tracking-widest">DOKUMENTATION AKTIV</span>
                </div>
                <div class="h-4 w-px bg-tac-border"></div>
                <div class="font-mono text-[10px] text-tac-muted uppercase tracking-tighter">API BASE: <span class="text-white">https://bwrp.net/api</span></div>
            </div>
            <div class="flex items-center gap-6">
                <div id="clock" class="font-mono text-[10px] text-tac-muted tabular-nums">00:00:00 UTC</div>
                <i data-lucide="wifi" class="w-4 h-4 text-tac-muted"></i>
            </div>
        </div>

        <div class="p-8 max-w-5xl mx-auto w-full">
            
            <div class="mb-12">
                <h1 class="font-display text-4xl font-bold text-white tracking-wider uppercase mb-2">Technisches Protokoll</h1>
                <p class="font-mono text-xs text-tac-muted flex items-center gap-2">
                    <i data-lucide="terminal" class="w-3.5 h-3.5"></i> API-REFERENZ FÜR DEN STAFF-PANEL BACKEND-DIENST
                </p>
            </div>

            <!-- Intro Card -->
            <div class="bg-tac-panel border border-tac-border p-6 mb-16 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i data-lucide="info" class="w-24 h-24 text-tac-amber"></i>
                </div>
                <h2 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <span class="w-1 h-6 bg-tac-amber"></span> ALLGEMEIN
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-[12px] leading-relaxed relative z-10">
                    <div class="space-y-4">
                        <div class="bg-black/40 border border-tac-border p-3">
                            <p class="text-tac-muted mb-1 text-[9px] uppercase tracking-widest">Base Address</p>
                            <p class="text-white">https://bwrp.net/api</p>
                        </div>
                        <p class="text-zinc-400">Das API-Backend nutzt modernste Cloudflare Edge-Technologie für minimale Latenzen weltweit.</p>
                    </div>
                    <div class="space-y-4">
                        <div class="bg-black/40 border border-tac-border p-3">
                            <p class="text-tac-muted mb-1 text-[9px] uppercase tracking-widest">Authentifizierung</p>
                            <p class="text-tac-amber">HTTPONLY COOKIES (Access & Refresh)</p>
                        </div>
                        <p class="text-zinc-400">Die Sitzungsverwaltung erfolgt über sicherheitsgehärtete Cookies, die automatisch vom Browser mitgesendet werden.</p>
                    </div>
                </div>
            </div>

            <!-- AUTHENTICATION -->
            <section id="auth" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="lock" class="w-6 h-6 text-tac-blue"></i>
                    AUTHENTICATION
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <!-- POST /auth/login -->
                    <div class="endpoint-card rounded shadow-lg overflow-hidden">
                        <header class="p-4 flex flex-wrap items-center gap-3 cursor-pointer select-none" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/auth/login</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Initialisiert die Session via OAuth Code</span>
                            <span class="bg-tac-green/10 text-tac-green border border-tac-green/20 px-2 py-0.5 text-[9px] font-mono rounded">PUBLIC</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div class="space-y-4">
                                    <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest">Parameter (JSON)</h4>
                                    <table class="w-full text-left font-mono text-[11px]">
                                        <thead>
                                            <tr class="text-tac-muted border-b border-tac-border">
                                                <th class="py-2">Feld</th>
                                                <th class="py-2">Typ</th>
                                                <th class="py-2">Pflicht</th>
                                            </tr>
                                        </thead>
                                        <tbody class="text-zinc-300">
                                            <tr class="border-b border-tac-border/5">
                                                <td class="py-2 font-bold text-blue-400">code</td>
                                                <td class="py-2">string</td>
                                                <td class="py-2 text-tac-red font-bold">YES</td>
                                            </tr>
                                            <tr>
                                                <td class="py-2 font-bold text-blue-400">redirect_uri</td>
                                                <td class="py-2">string</td>
                                                <td class="py-2">NO</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest">Response Beispiel</h4>
                                        <button onclick="copyCode(this)" class="text-[9px] font-mono text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                    </div>
                                    <pre class="text-tac-green"><code>{
  "success": true,
  "user": {
    "id": "123",
    "username": "Zane",
    "role": "OWNER",
    "avatarUrl": "https://..."
  }
}</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- POST /auth/refresh -->
                    <div class="endpoint-card rounded shadow-lg overflow-hidden">
                        <header class="p-4 flex flex-wrap items-center gap-3 cursor-pointer select-none" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/auth/refresh</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Erneuert das Access-Token mittels Refresh-Cookie</span>
                            <span class="bg-tac-green/10 text-tac-green border border-tac-green/20 px-2 py-0.5 text-[9px] font-mono rounded">PUBLIC</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <p class="text-xs text-zinc-400 font-mono mb-4 italic">// Benötigt den "bwrp_refresh" HttpOnly Cookie.</p>
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest">Response // 200 OK</h4>
                                <button onclick="copyCode(this)" class="text-[9px] font-mono text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                            </div>
                            <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            <!-- STAFF PANEL -->
            <section id="staff" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="users" class="w-6 h-6 text-tac-amber"></i>
                    STAFF PANEL
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <!-- GET /staff/me -->
                    <div class="endpoint-card rounded shadow-lg overflow-hidden">
                        <header class="p-4 flex flex-wrap items-center gap-3 cursor-pointer select-none" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/staff/me</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Gibt das eigene Benutzerprofil zurück</span>
                            <span class="bg-tac-blue/10 text-tac-blue border border-tac-blue/20 px-2 py-0.5 text-[9px] font-mono rounded">USER+</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest">Profile Response</h4>
                                <button onclick="copyCode(this)" class="text-[9px] font-mono text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                            </div>
                            <pre class="text-tac-green"><code>{
  "user": {
    "username": "Zane",
    "role": "OWNER",
    "avatar_url": "https://...",
    "sub": "roblox-id-123"
  }
}</code></pre>
                        </div>
                    </div>

                    <!-- GET /staff/roster -->
                    <div class="endpoint-card rounded shadow-lg overflow-hidden">
                        <header class="p-4 flex flex-wrap items-center gap-3 cursor-pointer select-none" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/staff/roster</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Vollständige Teamliste (Hirarchie)</span>
                            <span class="bg-tac-blue/10 text-tac-blue border border-tac-blue/20 px-2 py-0.5 text-[9px] font-mono rounded">USER+</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-green"><code>[
  { "id": "1", "username": "Admin", "role": "ADMIN", ... },
  ...
]</code></pre>
                        </div>
                    </div>

                    <!-- GET /staff/stats -->
                    <div class="endpoint-card rounded shadow-lg overflow-hidden">
                        <header class="p-4 flex flex-wrap items-center gap-3 cursor-pointer select-none" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/staff/stats</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Aggregierte Statistiken (Schichten, Bans, etc)</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                           <pre class="text-tac-green"><code>{
  "total_shifts": 42,
  "total_seconds": 151200,
  "week_cases": 12,
  "total_bans": 5
}</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            <!-- WATCHLIST -->
            <section id="watchlist" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="eye" class="w-6 h-6 text-yellow-500"></i>
                    WATCHLIST
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/watchlist</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Alle aktiven Beobachtungen</span>
                            <span class="bg-tac-red/10 text-tac-red border border-tac-red/20 px-2 py-0.5 text-[9px] font-mono rounded font-bold">MOD+</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-green"><code>[
  {
    "id": 15,
    "roblox_id": "123456",
    "username": "Troublemaker",
    "reason": "V.a. Mass-RDM",
    "added_by": "SeniorAdmin",
    "created_at": "..."
  }
]</code></pre>
                        </div>
                    </div>

                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/watchlist</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Person zur Liste hinzufügen</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest mb-4">JSON Payload</h4>
                            <pre class="text-tac-blue"><code>{
  "robloxId": "123",
  "username": "Zane",
  "reason": "Sollte beobachtet werden wegen..."
}</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            <!-- MODERATION -->
            <section id="moderation" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="gavel" class="w-6 h-6 text-tac-red"></i>
                    MODERATION SYSTEM
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/moderation/all</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Fallakten-Browser (mit Filter)</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                             <h4 class="font-mono text-[10px] text-tac-muted uppercase tracking-widest mb-3">Query Params</h4>
                             <div class="grid grid-cols-2 gap-4 text-[11px] font-mono mb-6">
                                <div><span class="text-blue-400">type</span>: WARN, KICK, BAN, PERMBAN</div>
                                <div><span class="text-blue-400">search</span>: Roblox Username</div>
                                <div><span class="text-blue-400">limit</span>: Default 50</div>
                                <div><span class="text-blue-400">offset</span>: Pagination</div>
                             </div>
                             <pre class="text-tac-green"><code>{
  "cases": [...],
  "total": 1250,
  "limit": 50,
  "offset": 0
}</code></pre>
                        </div>
                    </div>

                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/moderation/cases</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Manuellen Fallakte-Eintrag erstellen</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                             <pre class="text-tac-blue"><code>{
  "targetRobloxId": "123",
  "targetUsername": "Player",
  "type": "BAN",
  "reason": "RDM",
  "durationDays": 7
}</code></pre>
                        </div>
                    </div>
                </div>
            </section>

             <!-- SHIFTS -->
             <section id="shifts" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="clock" class="w-6 h-6 text-tac-green"></i>
                    SHIFT LOGS
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/shifts/start</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Dienstbeginn registrieren</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-green"><code>{ "success": true, "shiftId": 1234 }</code></pre>
                        </div>
                    </div>
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/shifts/end</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Dienst abschließen (mit Metrics)</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-blue"><code>{
  "cases": 5,
  "bans": 1,
  "warns": 2,
  "kicks": 0,
  "notes": "Sehr ruhige Schicht."
}</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ROBLOX PROXY -->
            <section id="roblox" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="database" class="w-6 h-6 text-tac-blue"></i>
                    ROBLOX PROXY
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/roblox/player/:identifier</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Spieler-Daten (Username oder ID)</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <p class="text-xs text-zinc-400 mb-4 uppercase font-mono tracking-tighter italic">// Proxy-Anfrage an Roblox API v1</p>
                            <pre class="text-tac-green"><code>{
  "id": 1234567,
  "name": "Zane",
  "displayName": "Zane",
  "avatarUrl": "https://..."
}</code></pre>
                        </div>
                    </div>
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-get px-3 py-1 font-mono text-[10px] font-bold border">GET</span>
                            <code class="font-mono text-[13px] font-bold text-white">/roblox/servers</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Liste aller aktiven Spiel-Instanzen</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted transition-transform"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-green"><code>[
  {
    "id": "guid",
    "maxPlayers": 50,
    "playing": 12,
    "fps": 59.8,
    "ping": 42
  }
]</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            <!-- OPEN CLOUD -->
            <section id="cloud" class="mb-20 scroll-mt-24">
                <h3 class="font-display text-2xl font-bold text-white mb-8 flex items-center gap-4">
                    <i data-lucide="cloud" class="w-6 h-6 text-purple-500"></i>
                    OPEN CLOUD (DIRECT ACTIONS)
                    <span class="flex-1 h-px bg-tac-border ml-4"></span>
                </h3>

                <div class="space-y-4">
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/api/cloud/kick</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Direkter Kick-Call via MessagingService</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30 text-xs font-mono">
                            <p class="mb-4 text-purple-400 font-bold">WICHTIG: Kommuniziert direkt mit dem Ingame-Server!</p>
                            <pre class="text-tac-blue"><code>{
  "targetRobloxId": 123456,
  "targetUsername": "Player1",
  "reason": "Regelverstoß §1"
}</code></pre>
                        </div>
                    </div>
                    <div class="endpoint-card rounded overflow-hidden">
                        <header class="p-4 flex items-center gap-3 cursor-pointer" onclick="toggleEndpoint(this)">
                            <span class="method-post px-3 py-1 font-mono text-[10px] font-bold border uppercase tracking-widest">POST</span>
                            <code class="font-mono text-[13px] font-bold text-white">/api/cloud/ban</code>
                            <span class="text-[10px] font-mono text-tac-muted uppercase flex-1 truncate ml-2">Universeller Native-Ban (Roblox Engine Level)</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-tac-muted"></i>
                        </header>
                        <div class="hidden border-t border-tac-border p-6 bg-black/30">
                            <pre class="text-tac-blue"><code>{
  "targetRobloxId": 123456,
  "reason": "Bugusing",
  "displayReason": "Unfairer Spielvorteil",
  "durationDays": 30
}</code></pre>
                        </div>
                    </div>
                </div>
            </section>

        </div>

        <!-- Footer -->
        <footer class="mt-auto border-t border-tac-border p-12 bg-tac-panel/50 text-center relative overflow-hidden">
             <div class="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
             <p class="font-display font-bold text-white tracking-[0.4em] uppercase mb-4">Atlantic Command Backend</p>
             <p class="font-mono text-[9px] text-tac-muted tracking-[0.2em] uppercase max-w-lg mx-auto leading-relaxed">
                Diese Dokumentation unterliegt der Sicherheitsstufe IV. Jegliche unbefugte Nutzung oder Extraktion von Daten wird protokolliert.
             </p>
             <div class="mt-8 font-mono text-[10px] text-tac-muted">
                &copy; 2026 ATLANTIC COMMAND // DISTRIBUTED LEDGER SYSTEMS
             </div>
        </footer>
    </main>

    <script>
        lucide.createIcons();

        // Simple Clock
        function updateClock() {
            const now = new Date();
            const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
            document.getElementById('clock').textContent = timeStr;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Toggle Expand/Collapse
        function toggleEndpoint(header) {
            const body = header.nextElementSibling;
            const icon = header.querySelector('[data-lucide="chevron-down"]');
            
            if (body.classList.contains('hidden')) {
                body.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
                header.classList.add('bg-white/5');
            } else {
                body.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
                header.classList.remove('bg-white/5');
            }
        }

        // Copy Code to Clipboard
        async function copyCode(btn) {
            const pre = btn.closest('div').nextElementSibling;
            const code = pre.querySelector('code').innerText;
            
            try {
                await navigator.clipboard.writeText(code);
                const original = btn.innerText;
                btn.innerText = 'COPIED!';
                btn.classList.add('text-tac-green');
                setTimeout(() => {
                    btn.innerText = original;
                    btn.classList.remove('text-tac-green');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }

        // Mobile Menu
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });

        // Close sidebar on link click (mobile)
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebar.classList.add('-translate-x-full');
                }
            });
        });

        // Active Scroll Spy
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.sidebar-link').forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { threshold: 0.3 });

        document.querySelectorAll('section').forEach(section => observer.observe(section));
    </script>
</body>
</html>\`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

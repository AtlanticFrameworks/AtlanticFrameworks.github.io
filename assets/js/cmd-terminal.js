/* assets/js/cmd-terminal.js
 * Command Terminal — self-contained, no dependencies.
 * Ctrl+Shift+P to open. TOTP auth → 2-min session → command input.
 */
(function () {
  'use strict';

  // ── Config ───────────────────────────────────────────────────────────────
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787/api'
    : 'https://bwrp.net/api';

  // ── State ────────────────────────────────────────────────────────────────
  let session            = null;
  let timerInterval      = null;
  let selectedIdx        = -1;
  let currentSuggestions = [];

  // ── Autocomplete constants ────────────────────────────────────────────────
  const MAX_SUGGESTIONS = 8;
  const ROLES    = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
  const STATUSES = ['OPERATIONAL', 'ONLINE', 'SYNCED', 'OFFLINE', 'DEGRADED'];

  const COMMANDS = [
    { id: 'reset-ipaccess',   tokens: ['reset',    'ipaccess'],     args: [{ name: 'username',   source: 'accounts' }],                                        desc: 'Clear IP lock for account'          },
    { id: 'set-role',         tokens: ['set',      'role'],         args: [{ name: 'username',   source: 'accounts' }, { name: 'role',   source: 'roles' }],   desc: 'Change user role'                   },
    { id: 'clear-sessions',   tokens: ['clear',    'sessions'],     args: [{ name: 'username',   source: 'accounts' }],                                        desc: 'Delete all sessions for user'       },
    { id: 'delete-user',      tokens: ['delete',   'user'],         args: [{ name: 'username',   source: 'accounts' }],                                        desc: 'Remove user from DB'                },
    { id: 'kick-player',      tokens: ['kick',     'player'],       args: [{ name: 'robloxId',   source: null }, { name: 'reason...', source: null }],         desc: 'Kick player from game'              },
    { id: 'ban-player',       tokens: ['ban',      'player'],       args: [{ name: 'robloxId',   source: null }, { name: 'reason...', source: null }],         desc: 'Ban player from game'               },
    { id: 'unban-player',     tokens: ['unban',    'player'],       args: [{ name: 'robloxId',   source: null }],                                              desc: 'Remove game ban'                    },
    { id: 'shutdown-server',  tokens: ['shutdown', 'server'],       args: [{ name: 'serverJobId',source: null }],                                              desc: 'Shutdown specific server (Job ID)'  },
    { id: 'restart-servers',  tokens: ['restart',  'servers'],      args: [],                                                                                  desc: 'Restart all game servers'           },
    { id: 'clear-ratelimits', tokens: ['clear',    'ratelimits'],   args: [],                                                                                  desc: 'Wipe all rate limit entries'        },
    { id: 'set-serverstatus', tokens: ['set',      'serverstatus'], args: [{ name: 'service',    source: 'services' }, { name: 'status', source: 'statuses' }],desc: 'Update server status display'       },
    { id: 'announce',         tokens: ['announce'],                 args: [{ name: 'message...', source: null }],                                              desc: 'Post to Discord monitoring webhook' },
  ];

  // ── Styles + DOM injection ────────────────────────────────────────────────
  const STYLES = `
    #cmd-overlay {
      display:none; position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,.75); backdrop-filter:blur(4px);
      align-items:flex-start; justify-content:center; padding-top:15vh;
      font-family:'JetBrains Mono','Courier New',monospace;
    }
    #cmd-overlay.cmd-open { display:flex; }
    #cmd-card { background:#111114; border:1px solid #252529; width:620px; max-width:95vw; }
    #cmd-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:9px 14px; border-bottom:1px solid #252529;
      font-size:9px; letter-spacing:.15em; color:#71717a;
    }
    #cmd-header .cmd-title { color:#e2a800; }
    #cmd-input-wrap {
      display:flex; align-items:center; gap:10px;
      padding:12px 14px; border-bottom:1px solid #1a1a1e;
    }
    #cmd-input-wrap .cmd-prompt { color:#e2a800; font-size:13px; user-select:none; }
    #cmd-input, #cmd-totp-input {
      width:100%; background:transparent; border:none; outline:none;
      color:#fff; font-family:inherit; font-size:14px; caret-color:#e2a800;
    }
    #cmd-totp-input { text-align:center; letter-spacing:.4em; font-size:22px; }
    #cmd-totp-wrap  { padding:24px 20px; }
    #cmd-totp-hint  { font-size:10px; color:#52525b; letter-spacing:.08em; margin-bottom:14px; }
    #cmd-totp-error { font-size:10px; color:#ef4444; letter-spacing:.05em; margin-top:8px; min-height:16px; }
    #cmd-suggestions { max-height:280px; overflow-y:auto; }
    .cmd-suggestion {
      display:flex; align-items:baseline; gap:10px;
      padding:7px 14px; cursor:pointer; border-left:2px solid transparent; font-size:12px;
    }
    .cmd-suggestion:hover, .cmd-suggestion.cmd-sel {
      background:rgba(226,168,0,.07); border-left-color:#e2a800;
    }
    .cmd-sug-name  { color:#a1a1aa; flex:1; }
    .cmd-sug-name .cmd-hi { color:#e2a800; }
    .cmd-sug-args  { color:#3f3f46; font-size:11px; }
    .cmd-sug-desc  { color:#52525b; font-size:10px; white-space:nowrap; }
    #cmd-result {
      padding:8px 14px; font-size:11px; letter-spacing:.04em;
      border-top:1px solid #1a1a1e; min-height:28px; display:none;
    }
    #cmd-result.ok      { color:#4ade80; display:block; }
    #cmd-result.err     { color:#f87171; display:block; }
    #cmd-result.pending { color:#71717a; display:block; }
    #cmd-timer { font-size:11px; color:#e2a800; letter-spacing:.06em; }
    #cmd-timer.warn { color:#f97316; }
    #cmd-timer.crit { color:#ef4444; }
  `;

  function injectDOM() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'cmd-overlay';
    el.innerHTML = `
      <div id="cmd-card">
        <div id="cmd-header">
          <span class="cmd-title">KOMMANDO TERMINAL</span>
          <span id="cmd-timer" style="display:none"></span>
        </div>
        <div id="cmd-totp-view">
          <div id="cmd-totp-wrap">
            <div id="cmd-totp-hint">AUTHENTICATOR-CODE EINGEBEN</div>
            <input id="cmd-totp-input" type="text" maxlength="6"
                   placeholder="000000" inputmode="numeric" autocomplete="one-time-code">
            <div id="cmd-totp-error"></div>
          </div>
        </div>
        <div id="cmd-command-view" style="display:none">
          <div id="cmd-input-wrap">
            <span class="cmd-prompt">&#8250;</span>
            <input id="cmd-input" type="text" placeholder="Befehl eingeben..."
                   autocomplete="off" spellcheck="false">
          </div>
          <div id="cmd-suggestions"></div>
          <div id="cmd-result"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    console.log('[CMD] DOM ready');
  }

  // ── Session helpers ───────────────────────────────────────────────────────
  function sessionValid() {
    return session !== null && Math.floor(Date.now() / 1000) < session.expiresUnix;
  }
  function clearSession() {
    session = null;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── Overlay open/close ────────────────────────────────────────────────────
  function openOverlay() {
    const ov = document.getElementById('cmd-overlay');
    if (!ov) return;
    ov.classList.add('cmd-open');
    if (sessionValid()) { showCommandView(); } else { clearSession(); showTotpView(); }
  }
  function closeOverlay() {
    const ov = document.getElementById('cmd-overlay');
    if (ov) ov.classList.remove('cmd-open');
  }

  function showTotpView() {
    document.getElementById('cmd-totp-view').style.display    = '';
    document.getElementById('cmd-command-view').style.display = 'none';
    document.getElementById('cmd-timer').style.display        = 'none';
    document.getElementById('cmd-totp-error').textContent     = '';
    const inp = document.getElementById('cmd-totp-input');
    inp.value = '';
    setTimeout(() => inp.focus(), 50);
  }

  function showCommandView() {
    document.getElementById('cmd-totp-view').style.display    = 'none';
    document.getElementById('cmd-command-view').style.display = '';
    document.getElementById('cmd-timer').style.display        = '';
    const res = document.getElementById('cmd-result');
    res.className = ''; res.textContent = '';
    const inp = document.getElementById('cmd-input');
    inp.value = '';
    renderSuggestions('');
    setTimeout(() => inp.focus(), 50);
    startTimer();
    console.log('[CMD] command view. accounts:', session.accounts.length, '/ services:', session.services.length);
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!session) { clearInterval(timerInterval); return; }
      const left = Math.max(0, session.expiresUnix - Math.floor(Date.now() / 1000));
      const el = document.getElementById('cmd-timer');
      if (el) {
        el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        el.className = left < 30 ? 'crit' : left < 60 ? 'warn' : '';
      }
      if (left <= 0) { clearSession(); closeOverlay(); }
    }, 1000);
  }

  // ── TOTP auth ─────────────────────────────────────────────────────────────
  async function authenticate(code) {
    const errEl = document.getElementById('cmd-totp-error');
    errEl.textContent = 'VERIFIZIERUNG...';
    console.log('[CMD] auth attempt');
    try {
      const r = await fetch(`${API_BASE}/cmd/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.warn('[CMD] auth rejected:', d.error);
        errEl.textContent = d.error || 'Fehler';
        const ti = document.getElementById('cmd-totp-input');
        ti.value = ''; ti.focus();
        return;
      }
      const [uRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/cmd/users`,        { headers: { Authorization: `Bearer ${d.token}` } }),
        fetch(`${API_BASE}/cmd/serverstatus`, { headers: { Authorization: `Bearer ${d.token}` } }),
      ]);
      if (!uRes.ok) console.warn('[CMD] /cmd/users failed', uRes.status);
      if (!sRes.ok) console.warn('[CMD] /cmd/serverstatus failed', sRes.status);
      const uData = uRes.ok ? await uRes.json().catch(() => ({})) : {};
      const sData = sRes.ok ? await sRes.json().catch(() => ({})) : {};
      session = {
        token:       d.token,
        expiresUnix: d.expires,
        accounts:    uData.users     || [],
        services:    sData.services  || [],
      };
      console.log('[CMD] session ok. accounts:', session.accounts.map(a => a.username), 'services:', session.services);
      showCommandView();
    } catch (e) {
      console.error('[CMD] auth error:', e);
      errEl.textContent = 'Netzwerkfehler';
      document.getElementById('cmd-totp-input').focus();
    }
  }

  // ── Autocomplete logic ────────────────────────────────────────────────────
  function getArgSource(source) {
    if (!source || !session) return null;
    if (source === 'accounts') return session.accounts.map(a => a.username);
    if (source === 'roles')    return ROLES;
    if (source === 'statuses') return STATUSES;
    if (source === 'services') return session.services;
    return null;
  }

  function resolveAccount(name) {
    if (!session || !name) return null;
    return session.accounts.find(a => a.username.toLowerCase() === name.toLowerCase()) || null;
  }

  function getSuggestions(raw) {
    const trailingSpace = raw.length > 0 && raw[raw.length - 1] === ' ';
    const parts = raw.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return COMMANDS.map(c => ({
        type: 'cmd', cmd: c,
        label: c.tokens.join(' '),
        args:  c.args.map(a => '<' + a.name + '>').join(' '),
        hi: 0,
      }));
    }

    for (const c of COMMANDS) {
      const n = c.tokens.length;
      if (parts.length < n) continue;
      if (!c.tokens.every((t, i) => t === parts[i].toLowerCase())) continue;

      const fullCmd = parts.length > n || (parts.length === n && trailingSpace);
      if (!fullCmd) continue;

      const argParts = parts.slice(n);
      const argIdx   = trailingSpace ? argParts.length : Math.max(0, argParts.length - 1);
      const argDef   = c.args[argIdx];
      if (!argDef) return [];

      const partial      = trailingSpace ? '' : (argParts[argIdx] || '');
      const fixedParts   = trailingSpace ? argParts : argParts.slice(0, argIdx);
      const source       = getArgSource(argDef.source);

      if (!source) {
        return [{ type: 'ph', cmd: c, label: [...c.tokens, ...fixedParts].join(' '), args: '<' + argDef.name + '>', hi: 0 }];
      }

      const matches = source.filter(v => !partial || v.toLowerCase().startsWith(partial.toLowerCase()));
      const hiLen   = [...c.tokens, ...fixedParts].join(' ').length + 1;
      return matches.map(v => ({
        type: 'val', cmd: c, value: v,
        label: [...c.tokens, ...fixedParts, v].join(' '),
        args:  c.args.slice(argIdx + 1).map(a => '<' + a.name + '>').join(' '),
        hi: hiLen,
      }));
    }

    const low = raw.trim().toLowerCase();
    return COMMANDS
      .filter(c => c.tokens.join(' ').startsWith(low))
      .map(c => ({
        type: 'cmd', cmd: c,
        label: c.tokens.join(' '),
        args:  c.args.map(a => '<' + a.name + '>').join(' '),
        hi: low.length,
      }));
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function hlText(text, hiLen) {
    if (!hiLen) return '<span class="cmd-hi">' + esc(text) + '</span>';
    return '<span class="cmd-hi">' + esc(text.slice(0, hiLen)) + '</span>' + esc(text.slice(hiLen));
  }

  function renderSuggestions(raw) {
    currentSuggestions = getSuggestions(raw);
    selectedIdx = -1;
    const box = document.getElementById('cmd-suggestions');
    if (!box) { console.error('[CMD] #cmd-suggestions missing'); return; }

    if (!currentSuggestions.length) { box.innerHTML = ''; return; }

    box.innerHTML = currentSuggestions.slice(0, MAX_SUGGESTIONS).map((s, i) =>
      `<div class="cmd-suggestion" data-i="${i}">` +
        `<span class="cmd-sug-name">${hlText(s.label, s.hi)}</span>` +
        (s.args ? `<span class="cmd-sug-args">${esc(s.args)}</span>` : '') +
        `<span class="cmd-sug-desc">${esc(s.cmd.desc)}</span>` +
      `</div>`
    ).join('');
  }

  function selectSuggestion(idx) {
    const s   = currentSuggestions[idx];
    const inp = document.getElementById('cmd-input');
    if (!s || !inp || s.type === 'ph') return;
    inp.value = s.type === 'cmd'
      ? s.cmd.tokens.join(' ') + (s.cmd.args.length ? ' ' : '')
      : s.label + ' ';
    renderSuggestions(inp.value);
    inp.focus();
  }

  function highlightSelected() {
    document.querySelectorAll('.cmd-suggestion').forEach((el, i) =>
      el.classList.toggle('cmd-sel', i === selectedIdx));
  }

  function clearResult() {
    const el = document.getElementById('cmd-result');
    if (el) { el.className = ''; el.textContent = ''; }
  }

  function showResult(ok, msg) {
    const el = document.getElementById('cmd-result');
    if (!el) return;
    el.className  = ok === null ? 'pending' : ok ? 'ok' : 'err';
    el.textContent = msg;
    if (ok === false) console.warn('[CMD] result error:', msg);
    if (ok === true)  console.log('[CMD]  result ok:', msg);
  }

  // ── API + executors ───────────────────────────────────────────────────────
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
    };
    if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res  = await fetch(API_BASE + path, opts);
      const text = await res.text().catch(() => '');
      let data   = {};
      try { data = JSON.parse(text); } catch (_) {}
      const msg  = data.message || data.error || text || '?';
      console.log('[CMD] API', method, path, '→', res.status, msg);
      return { ok: res.ok, message: msg };
    } catch (e) {
      console.error('[CMD] fetch threw:', e);
      return { ok: false, message: e.message };
    }
  }

  const EXEC = {
    'reset-ipaccess':  async ([u]) => {
      const user = resolveAccount(u);
      if (!user) return { ok: false, message: `"${u || '?'}" nicht gefunden.` };
      return api('PATCH', `/cmd/users/${user.id}/reset-ip`, null);
    },
    'set-role': async ([u, role]) => {
      const user = resolveAccount(u);
      if (!user) return { ok: false, message: `"${u || '?'}" nicht gefunden.` };
      const r = (role || '').toUpperCase();
      if (!ROLES.includes(r)) return { ok: false, message: `Ungültige Rolle: ${r}` };
      return api('PATCH', `/cmd/users/${user.id}/role`, { role: r });
    },
    'clear-sessions': async ([u]) => {
      const user = resolveAccount(u);
      if (!user) return { ok: false, message: `"${u || '?'}" nicht gefunden.` };
      return api('DELETE', `/cmd/users/${user.id}/sessions`, null);
    },
    'delete-user': async ([u]) => {
      const user = resolveAccount(u);
      if (!user) return { ok: false, message: `"${u || '?'}" nicht gefunden.` };
      return api('DELETE', `/cmd/users/${user.id}`, null);
    },
    'kick-player':    async ([id, ...r]) => id ? api('POST', '/cmd/cloud/kick',    { robloxId: id, reason: r.join(' ') || 'Admin kick' }) : { ok: false, message: 'robloxId fehlt.' },
    'ban-player':     async ([id, ...r]) => id ? api('POST', '/cmd/cloud/ban',     { robloxId: id, reason: r.join(' ') || 'Admin ban'  }) : { ok: false, message: 'robloxId fehlt.' },
    'unban-player':   async ([id])       => id ? api('POST', '/cmd/cloud/unban',   { robloxId: id })                                      : { ok: false, message: 'robloxId fehlt.' },
    'shutdown-server':async ([id])       => id ? api('POST', '/cmd/cloud/shutdown',{ serverJobId: id })                                    : { ok: false, message: 'serverJobId fehlt.' },
    'restart-servers':async ()           => api('POST', '/cmd/cloud/restart-all', {}),
    'clear-ratelimits':async ()          => api('DELETE', '/cmd/rate-limits', null),
    'set-serverstatus':async ([svc, st]) => {
      if (!svc) return { ok: false, message: 'service fehlt.' };
      if (!st)  return { ok: false, message: 'status fehlt.' };
      return api('PATCH', `/cmd/db/serverstatus/${encodeURIComponent(svc)}`, { status: st.toUpperCase() });
    },
    'announce': async (parts) => {
      const msg = parts.join(' ');
      return msg ? api('POST', '/cmd/discord/announce', { message: msg }) : { ok: false, message: 'message fehlt.' };
    },
  };

  async function run(raw) {
    console.log('[CMD] run:', JSON.stringify(raw));
    if (!raw.trim()) return;
    if (!sessionValid()) { showResult(false, 'Session abgelaufen.'); return; }

    const parts = raw.trim().split(/\s+/);
    let matched = null, argParts = [];
    for (const c of COMMANDS) {
      if (parts.length >= c.tokens.length && c.tokens.every((t, i) => t === parts[i].toLowerCase())) {
        matched  = c;
        argParts = parts.slice(c.tokens.length);
        break;
      }
    }
    if (!matched)       { showResult(false, `Unbekannter Befehl: "${parts[0]}"`); return; }
    if (!EXEC[matched.id]) { showResult(false, `Kein Executor: ${matched.id}`); return; }

    showResult(null, 'WIRD AUSGEFÜHRT...');
    try {
      const res = await EXEC[matched.id](argParts);
      showResult(res.ok, res.message);
      if (res.ok) {
        const inp = document.getElementById('cmd-input');
        if (inp) inp.value = '';
        renderSuggestions('');
      }
    } catch (e) {
      console.error('[CMD] executor threw:', e);
      showResult(false, e.message);
    }
  }

  // ── Event delegation (registered immediately on document) ─────────────────
  // All events bubble up to document — no dependency on element lifecycle.

  // input events: TOTP auto-submit + command autocomplete
  document.addEventListener('input', function (e) {
    if (e.target.id === 'cmd-totp-input') {
      var val = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = val;
      if (val.length === 6) authenticate(val);
      return;
    }
    if (e.target.id === 'cmd-input') {
      console.log('[CMD] input:', JSON.stringify(e.target.value));
      renderSuggestions(e.target.value);
      clearResult();
    }
  });

  // click: suggestion selection + backdrop close
  document.addEventListener('mousedown', function (e) {
    // backdrop click
    if (e.target.id === 'cmd-overlay') { closeOverlay(); return; }
    // suggestion click
    var sug = e.target.closest('.cmd-suggestion');
    if (sug) {
      e.preventDefault();
      selectSuggestion(parseInt(sug.dataset.i, 10));
    }
  });

  // keydown: global hotkey + command input navigation
  document.addEventListener('keydown', function (e) {
    // Ctrl+Shift+P → toggle overlay
    if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      var ov = document.getElementById('cmd-overlay');
      if (!ov) return;
      ov.classList.contains('cmd-open') ? closeOverlay() : openOverlay();
      return;
    }
    // Escape → close overlay
    if (e.key === 'Escape') {
      var ov2 = document.getElementById('cmd-overlay');
      if (ov2 && ov2.classList.contains('cmd-open')) closeOverlay();
      return;
    }
    // Command input keys (only when cmd-input has focus)
    if (e.target.id !== 'cmd-input') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, Math.min(currentSuggestions.length, MAX_SUGGESTIONS) - 1);
      highlightSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, -1);
      highlightSelected();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      selectSuggestion(selectedIdx >= 0 ? selectedIdx : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      console.log('[CMD] Enter. selectedIdx:', selectedIdx, 'value:', JSON.stringify(e.target.value));
      if (selectedIdx >= 0 && currentSuggestions[selectedIdx] && currentSuggestions[selectedIdx].type !== 'ph') {
        selectSuggestion(selectedIdx);
      } else {
        run(e.target.value.trim());
      }
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  // Only injectDOM needs to wait for DOMContentLoaded.
  // All event listeners above are already active via document delegation.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDOM);
  } else {
    injectDOM();
  }

  console.log('[CMD] script loaded. delegation active.');

})();

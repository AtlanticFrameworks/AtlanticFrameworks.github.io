/* assets/js/cmd-terminal.js
 * Command Terminal — self-contained, no dependencies.
 * Ctrl+Shift+P to open. TOTP auth → 2-min session → command input.
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787/api'
    : 'https://bwrp.net/api';

  // ── State ────────────────────────────────────────────────────────────────
  let session          = null;  // { token, expiresUnix, accounts, services }
  let timerInterval    = null;
  let selectedIdx      = -1;
  let currentSuggestions = [];

  // ── Autocomplete Data ────────────────────────────────────────────────────
  const MAX_SUGGESTIONS = 8;
  const ROLES    = ['OWNER', 'ADMIN', 'MOD', 'TRAINEE'];
  const STATUSES = ['OPERATIONAL', 'ONLINE', 'SYNCED', 'OFFLINE', 'DEGRADED'];

  const COMMANDS = [
    { id: 'reset-ipaccess',  tokens: ['reset',    'ipaccess'],    args: [{ name: 'username', source: 'accounts' }],                                      desc: 'Clear IP lock for account'          },
    { id: 'set-role',        tokens: ['set',      'role'],        args: [{ name: 'username', source: 'accounts' }, { name: 'role', source: 'roles' }],   desc: 'Change user role'                   },
    { id: 'clear-sessions',  tokens: ['clear',    'sessions'],    args: [{ name: 'username', source: 'accounts' }],                                      desc: 'Delete all sessions for user'       },
    { id: 'delete-user',     tokens: ['delete',   'user'],        args: [{ name: 'username', source: 'accounts' }],                                      desc: 'Remove user from DB'                },
    { id: 'kick-player',     tokens: ['kick',     'player'],      args: [{ name: 'robloxId', source: null }, { name: 'reason...', source: null }],       desc: 'Kick player from game'              },
    { id: 'ban-player',      tokens: ['ban',      'player'],      args: [{ name: 'robloxId', source: null }, { name: 'reason...', source: null }],       desc: 'Ban player from game'               },
    { id: 'unban-player',    tokens: ['unban',    'player'],      args: [{ name: 'robloxId', source: null }],                                            desc: 'Remove game ban'                    },
    { id: 'shutdown-server', tokens: ['shutdown', 'server'],      args: [{ name: 'serverJobId', source: null }],                                         desc: 'Shutdown specific server (Job ID)'  },
    { id: 'restart-servers', tokens: ['restart',  'servers'],     args: [],                                                                              desc: 'Restart all game servers'           },
    { id: 'clear-ratelimits',tokens: ['clear',    'ratelimits'],  args: [],                                                                              desc: 'Wipe all rate limit entries'        },
    { id: 'set-serverstatus',tokens: ['set',      'serverstatus'],args: [{ name: 'service', source: 'services' }, { name: 'status', source: 'statuses' }],desc: 'Update server status display'      },
    { id: 'announce',        tokens: ['announce'],                args: [{ name: 'message...', source: null }],                                          desc: 'Post to Discord monitoring webhook' },
  ];

  // ── DOM ──────────────────────────────────────────────────────────────────
  const STYLES = `
    #cmd-overlay {
      display: none; position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      align-items: flex-start; justify-content: center; padding-top: 15vh;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    }
    #cmd-overlay.cmd-open { display: flex; }
    #cmd-card { background: #111114; border: 1px solid #252529; width: 620px; max-width: 95vw; }
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
    .cmd-sug-desc { color: #52525b; font-size: 10px; white-space: nowrap; }
    #cmd-result {
      padding: 8px 14px; font-size: 11px; letter-spacing: .04em;
      border-top: 1px solid #1a1a1e; min-height: 28px; display: none;
    }
    #cmd-result.cmd-ok      { color: #4ade80; display: block; }
    #cmd-result.cmd-err     { color: #f87171; display: block; }
    #cmd-result.cmd-pending { color: #71717a; display: block; }
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
            <span class="cmd-prompt">›</span>
            <input id="cmd-input" type="text" placeholder="Befehl eingeben..." autocomplete="off" spellcheck="false">
          </div>
          <div id="cmd-suggestions"></div>
          <div id="cmd-result"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    console.log('[CMD] DOM injected');
  }

  // ── Session ──────────────────────────────────────────────────────────────
  function sessionValid() {
    return session !== null && Math.floor(Date.now() / 1000) < session.expiresUnix;
  }

  function clearSession() {
    session = null;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── Overlay control ──────────────────────────────────────────────────────
  function openOverlay() {
    document.getElementById('cmd-overlay').classList.add('cmd-open');
    if (sessionValid()) {
      console.log('[CMD] reusing existing session');
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
    document.getElementById('cmd-totp-view').style.display    = '';
    document.getElementById('cmd-command-view').style.display = 'none';
    document.getElementById('cmd-timer').style.display        = 'none';
    document.getElementById('cmd-totp-error').textContent     = '';
    const input = document.getElementById('cmd-totp-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }

  function showCommandView() {
    document.getElementById('cmd-totp-view').style.display    = 'none';
    document.getElementById('cmd-command-view').style.display = '';
    document.getElementById('cmd-timer').style.display        = '';
    document.getElementById('cmd-result').className           = '';
    document.getElementById('cmd-result').textContent         = '';
    const input = document.getElementById('cmd-input');
    input.value = '';
    renderSuggestions('');
    setTimeout(() => input.focus(), 50);
    startTimer();
    console.log('[CMD] command view shown, accounts:', session ? session.accounts.length : 0, 'services:', session ? session.services.length : 0);
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
        el.className   = left < 30 ? 'cmd-crit' : left < 60 ? 'cmd-warn' : '';
      }
      if (left <= 0) { clearSession(); closeOverlay(); }
    }, 1000);
  }

  // ── TOTP Auth ────────────────────────────────────────────────────────────
  async function authenticate(code) {
    const errEl = document.getElementById('cmd-totp-error');
    errEl.textContent = 'VERIFIZIERUNG...';
    console.log('[CMD] authenticating...');

    try {
      const res = await fetch(`${API_BASE}/cmd/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[CMD] auth failed:', data.error);
        errEl.textContent = data.error || 'Fehler';
        const ti = document.getElementById('cmd-totp-input');
        ti.value = ''; ti.focus();
        return;
      }

      console.log('[CMD] auth OK, fetching autocomplete data...');
      const [usersRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE}/cmd/users`,        { headers: { Authorization: `Bearer ${data.token}` } }),
        fetch(`${API_BASE}/cmd/serverstatus`, { headers: { Authorization: `Bearer ${data.token}` } }),
      ]);

      const usersData    = usersRes.ok    ? await usersRes.json().catch(() => ({}))    : {};
      const servicesData = servicesRes.ok ? await servicesRes.json().catch(() => ({})) : {};

      if (!usersRes.ok)    console.warn('[CMD] /cmd/users failed:', usersRes.status);
      if (!servicesRes.ok) console.warn('[CMD] /cmd/serverstatus failed:', servicesRes.status);

      session = {
        token:       data.token,
        expiresUnix: data.expires,
        accounts:    usersData.users     || [],
        services:    servicesData.services || [],
      };

      console.log('[CMD] session created. accounts:', session.accounts.length, session.accounts.map(a => a.username));
      console.log('[CMD] services:', session.services);

      showCommandView();
    } catch (e) {
      console.error('[CMD] authenticate error:', e);
      errEl.textContent = 'Netzwerkfehler';
      document.getElementById('cmd-totp-input').focus();
    }
  }

  // ── Autocomplete helpers ─────────────────────────────────────────────────
  function getArgSource(source) {
    if (!source || !session) return null;
    switch (source) {
      case 'accounts': return session.accounts.map(a => a.username);
      case 'roles':    return ROLES;
      case 'statuses': return STATUSES;
      case 'services': return session.services;
      default:         return null;
    }
  }

  function resolveAccount(name) {
    if (!session || !name) return null;
    return session.accounts.find(a => a.username.toLowerCase() === name.toLowerCase()) || null;
  }

  // ── Suggestion engine ────────────────────────────────────────────────────
  function getSuggestions(raw) {
    const hasTrailing = raw.length > 0 && raw[raw.length - 1] === ' ';
    const parts = raw.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return COMMANDS.map(cmd => ({
        type: 'command', cmd,
        displayCommand: cmd.tokens.join(' '),
        displayArgs:    cmd.args.map(a => `<${a.name}>`).join(' '),
        matchLen: 0,
      }));
    }

    // Check if a command is fully typed
    for (const cmd of COMMANDS) {
      const n = cmd.tokens.length;
      if (parts.length < n) continue;
      const allMatch = cmd.tokens.every((t, i) => t === parts[i].toLowerCase());
      if (!allMatch) continue;

      const fullyTyped = parts.length > n || (parts.length === n && hasTrailing);
      if (!fullyTyped) continue;

      // We are in argument-entry mode for this command
      const argParts  = parts.slice(n);
      const argIdx    = hasTrailing ? argParts.length : Math.max(0, argParts.length - 1);
      const currentArg = cmd.args[argIdx];
      if (!currentArg) return [];  // all args provided — ready to execute

      const partial       = hasTrailing ? '' : (argParts[argIdx] || '');
      const source        = getArgSource(currentArg.source);
      const fixedArgParts = hasTrailing ? argParts : argParts.slice(0, argIdx);

      if (!source) {
        return [{ type: 'placeholder', cmd, displayCommand: [...cmd.tokens, ...fixedArgParts].join(' '), displayArgs: `<${currentArg.name}>`, matchLen: 0 }];
      }

      const filtered = source.filter(v => !partial || v.toLowerCase().startsWith(partial.toLowerCase()));
      const prefixLen = [...cmd.tokens, ...fixedArgParts].join(' ').length + 1;
      return filtered.map(v => ({
        type: 'value', cmd, value: v,
        displayCommand: [...cmd.tokens, ...fixedArgParts, v].join(' '),
        displayArgs:    cmd.args.slice(argIdx + 1).map(a => `<${a.name}>`).join(' '),
        matchLen: prefixLen, partial,
      }));
    }

    // Command still being typed — prefix filter
    const inputLower = raw.trim().toLowerCase();
    return COMMANDS
      .filter(cmd => cmd.tokens.join(' ').startsWith(inputLower))
      .map(cmd => ({
        type: 'command', cmd,
        displayCommand: cmd.tokens.join(' '),
        displayArgs:    cmd.args.map(a => `<${a.name}>`).join(' '),
        matchLen: inputLower.length,
      }));
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(text, matchLen) {
    if (!matchLen) return `<span class="cmd-match">${escHtml(text)}</span>`;
    return `<span class="cmd-match">${escHtml(text.slice(0, matchLen))}</span>${escHtml(text.slice(matchLen))}`;
  }

  function renderSuggestions(raw) {
    currentSuggestions = getSuggestions(raw);
    selectedIdx = -1;
    const container = document.getElementById('cmd-suggestions');
    if (!container) { console.error('[CMD] #cmd-suggestions not found'); return; }

    if (!currentSuggestions.length) { container.innerHTML = ''; return; }

    container.innerHTML = currentSuggestions.slice(0, MAX_SUGGESTIONS).map((sug, i) => `
      <div class="cmd-suggestion" data-idx="${i}">
        <span class="cmd-sug-text">${highlight(sug.displayCommand, sug.matchLen)}</span>
        ${sug.displayArgs ? `<span class="cmd-sug-args">${escHtml(sug.displayArgs)}</span>` : ''}
        <span class="cmd-sug-desc">${escHtml(sug.cmd.desc)}</span>
      </div>`).join('');

    container.querySelectorAll('.cmd-suggestion').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectSuggestion(parseInt(el.dataset.idx));
      });
    });
  }

  function selectSuggestion(idx) {
    const sug   = currentSuggestions[idx];
    const input = document.getElementById('cmd-input');
    if (!sug || !input) return;

    if (sug.type === 'placeholder') return;
    input.value = sug.type === 'command'
      ? sug.cmd.tokens.join(' ') + (sug.cmd.args.length ? ' ' : '')
      : sug.displayCommand + ' ';

    renderSuggestions(input.value);
    input.focus();
  }

  function updateSelectedHighlight() {
    document.querySelectorAll('.cmd-suggestion').forEach((el, i) =>
      el.classList.toggle('cmd-selected', i === selectedIdx));
  }

  function clearResult() {
    const r = document.getElementById('cmd-result');
    if (r) { r.className = ''; r.textContent = ''; }
  }

  function showResult(ok, message) {
    const el = document.getElementById('cmd-result');
    if (!el) { console.error('[CMD] #cmd-result not found'); return; }
    el.className  = ok === null ? 'cmd-pending' : ok ? 'cmd-ok' : 'cmd-err';
    el.textContent = message;
    if (ok === false) console.warn('[CMD] command error:', message);
    if (ok === true)  console.log('[CMD] command success:', message);
  }

  // ── API helper ───────────────────────────────────────────────────────────
  async function cmdFetch(method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${session.token}`,
      },
    };
    if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res  = await fetch(`${API_BASE}${path}`, opts);
      const text = await res.text().catch(() => '');
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}
      const message = data.message || data.error || text || '?';
      console.log(`[CMD] ${method} ${path} →`, res.status, message);
      return { ok: res.ok, message };
    } catch (e) {
      console.error('[CMD] fetch error:', e);
      return { ok: false, message: e.message };
    }
  }

  // ── Executors ────────────────────────────────────────────────────────────
  const EXECUTORS = {
    'reset-ipaccess': async ([username]) => {
      const user = resolveAccount(username);
      if (!user) return { ok: false, message: `Benutzer "${username || '?'}" nicht gefunden.` };
      return cmdFetch('PATCH', `/cmd/users/${user.id}/reset-ip`, null);
    },
    'set-role': async ([username, role]) => {
      const user = resolveAccount(username);
      if (!user) return { ok: false, message: `Benutzer "${username || '?'}" nicht gefunden.` };
      const r = (role || '').toUpperCase();
      if (!ROLES.includes(r)) return { ok: false, message: `Ungültige Rolle. Erlaubt: ${ROLES.join(', ')}` };
      return cmdFetch('PATCH', `/cmd/users/${user.id}/role`, { role: r });
    },
    'clear-sessions': async ([username]) => {
      const user = resolveAccount(username);
      if (!user) return { ok: false, message: `Benutzer "${username || '?'}" nicht gefunden.` };
      return cmdFetch('DELETE', `/cmd/users/${user.id}/sessions`, null);
    },
    'delete-user': async ([username]) => {
      const user = resolveAccount(username);
      if (!user) return { ok: false, message: `Benutzer "${username || '?'}" nicht gefunden.` };
      return cmdFetch('DELETE', `/cmd/users/${user.id}`, null);
    },
    'kick-player': async ([robloxId, ...rest]) => {
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/kick', { robloxId, reason: rest.join(' ') || 'Admin kick' });
    },
    'ban-player': async ([robloxId, ...rest]) => {
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/ban', { robloxId, reason: rest.join(' ') || 'Admin ban' });
    },
    'unban-player': async ([robloxId]) => {
      if (!robloxId) return { ok: false, message: 'robloxId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/unban', { robloxId });
    },
    'shutdown-server': async ([serverJobId]) => {
      if (!serverJobId) return { ok: false, message: 'serverJobId fehlt.' };
      return cmdFetch('POST', '/cmd/cloud/shutdown', { serverJobId });
    },
    'restart-servers': async () => cmdFetch('POST', '/cmd/cloud/restart-all', {}),
    'clear-ratelimits': async () => cmdFetch('DELETE', '/cmd/rate-limits', null),
    'set-serverstatus': async ([service, status]) => {
      if (!service) return { ok: false, message: 'service fehlt.' };
      if (!status)  return { ok: false, message: 'status fehlt.' };
      return cmdFetch('PATCH', `/cmd/db/serverstatus/${encodeURIComponent(service)}`, { status: status.toUpperCase() });
    },
    'announce': async (argParts) => {
      const message = argParts.join(' ');
      if (!message) return { ok: false, message: 'message fehlt.' };
      return cmdFetch('POST', '/cmd/discord/announce', { message });
    },
  };

  // ── Execute ──────────────────────────────────────────────────────────────
  async function executeCommand(raw) {
    console.log('[CMD] executeCommand:', raw);
    if (!raw.trim()) return;
    if (!sessionValid()) {
      showResult(false, 'Session abgelaufen — bitte erneut authentifizieren.');
      return;
    }

    const parts = raw.trim().split(/\s+/);
    let matchedCmd = null;
    let argParts   = [];

    for (const cmd of COMMANDS) {
      const n = cmd.tokens.length;
      if (parts.length < n) continue;
      if (cmd.tokens.every((t, i) => t === parts[i].toLowerCase())) {
        matchedCmd = cmd;
        argParts   = parts.slice(n);
        break;
      }
    }

    if (!matchedCmd) { showResult(false, `Unbekannter Befehl: "${parts[0]}"`); return; }

    const executor = EXECUTORS[matchedCmd.id];
    if (!executor) { showResult(false, `Kein Executor für "${matchedCmd.id}".`); return; }

    showResult(null, 'WIRD AUSGEFÜHRT...');
    try {
      const result = await executor(argParts);
      showResult(result.ok, result.message);
      if (result.ok) {
        document.getElementById('cmd-input').value = '';
        renderSuggestions('');
      }
    } catch (e) {
      console.error('[CMD] executor threw:', e);
      showResult(false, e.message);
    }
  }

  // ── Init (runs after all declarations) ──────────────────────────────────
  function init() {
    console.log('[CMD] init, readyState:', document.readyState);
    injectDOM();

    // Global key: Ctrl+Shift+P toggles overlay; Escape closes
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        const overlay = document.getElementById('cmd-overlay');
        if (!overlay) return;
        overlay.classList.contains('cmd-open') ? closeOverlay() : openOverlay();
        return;
      }
      if (e.key === 'Escape') {
        const overlay = document.getElementById('cmd-overlay');
        if (overlay && overlay.classList.contains('cmd-open')) closeOverlay();
      }
    });

    // TOTP input
    document.getElementById('cmd-totp-input').addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = val;
      if (val.length === 6) authenticate(val);
    });

    // Command input
    const cmdInput = document.getElementById('cmd-input');
    if (!cmdInput) { console.error('[CMD] #cmd-input not found after injectDOM!'); return; }

    cmdInput.addEventListener('input', (e) => {
      console.log('[CMD] input event:', JSON.stringify(e.target.value));
      renderSuggestions(e.target.value);
      clearResult();
    });

    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, Math.min(currentSuggestions.length, MAX_SUGGESTIONS) - 1);
        updateSelectedHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, -1);
        updateSelectedHighlight();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(selectedIdx >= 0 ? selectedIdx : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        console.log('[CMD] Enter pressed, selectedIdx:', selectedIdx, 'value:', e.target.value);
        if (selectedIdx >= 0 && currentSuggestions[selectedIdx] && currentSuggestions[selectedIdx].type !== 'placeholder') {
          selectSuggestion(selectedIdx);
        } else {
          executeCommand(e.target.value.trim());
        }
      }
    });

    console.log('[CMD] all listeners attached');
  }

  // Run init after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

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

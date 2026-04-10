/**
 * BWRP Staff Panel – Authentication & Session Service
 * Manages OAuth flow, local sessions, and gate UI states.
 */

// ─── Configuration ──────────────────────────────────────────────────────────
const GROUP_ID = 34246821;
const ALLOWED_ROLES = [
    "Group Owner", "Ownership Team", "Projektleitung", "Projektverwaltung", "Management",
    "Teamverwaltung", "Head Administrator", "Administrator", "Junior Administrator",
    "Head Game Moderator", "Game Moderator"
];
const REDIRECT_URI = window.location.origin + window.location.pathname;

// ─── Toast System ───────────────────────────────────────────────────────────
function dismissToast(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'slideOutR 0.3s ease-in forwards';
    setTimeout(() => el?.remove(), 300);
}

/**
 * showToast(message, type, autoDismissMs)
 * type: 'success' | 'error' | 'info' | 'warn'
 * autoDismissMs: 0 = persistent (manual close required). Default 0 for all types.
 *   Pass a positive number to auto-dismiss (e.g. 4000 for 4 s).
 */
function showToast(message, type = 'info', autoDismissMs = 0) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const colorMap = {
        success: 'border-tac-green  text-tac-green  bg-tac-card',
        error:   'border-tac-red    text-tac-red    bg-tac-card',
        info:    'border-tac-amber  text-tac-amber  bg-tac-card',
        warn:    'border-yellow-500 text-yellow-400 bg-tac-card',
    };
    const iconMap = {
        success: 'circle-check',
        error:   'circle-x',
        info:    'info',
        warn:    'triangle-alert',
    };

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `pointer-events-auto flex items-start gap-3 px-4 py-3 border font-mono text-xs max-w-sm backdrop-blur-sm animate-slide-in-r ${colorMap[type] || colorMap.info}`;
    toast.innerHTML = `
        <i data-lucide="${iconMap[type] || 'info'}" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
        <span class="flex-1 leading-relaxed">${message}</span>
        <button onclick="dismissToast('${id}')" class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1 cursor-pointer" title="Schließen">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>`;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [toast] });

    if (autoDismissMs > 0) {
        setTimeout(() => dismissToast(id), autoDismissMs);
    }
}

// ─── Friendly API Error Messages ────────────────────────────────────────────
/**
 * Returns a short, user-friendly message for an ApiError.
 * Hides raw technical details from end-users.
 */
function friendlyApiError(e, fallback = 'Aktion fehlgeschlagen') {
    if (!e) return fallback;
    const status = e.status ?? 0;
    if (status === 404) return 'Nicht gefunden';
    if (status === 403) return 'Keine Berechtigung';
    if (status === 401) return 'Nicht angemeldet';
    if (status === 429) return 'Zu viele Anfragen – bitte warten';
    if (status === 503 || status === 502) return 'Dienst momentan nicht verfügbar';
    if (status >= 500)  return 'Serverfehler – bitte später erneut versuchen';
    // Use backend message if it's short and in German (no raw stack traces)
    const msg = e.message ?? '';
    if (msg && msg.length < 120 && !/Error:|at |TypeError|fetch failed/i.test(msg)) return msg;
    return fallback;
}

// ─── Session Management ─────────────────────────────────────────────────────
function saveSession(data) {
    localStorage.setItem('atlantic_staff_session', JSON.stringify({ ...data, timestamp: Date.now() }));
}

async function checkSession() {
    const raw = localStorage.getItem('atlantic_staff_session');
    if (!raw) return;
    try {
        const session = JSON.parse(raw);
        let meData = null;
        try {
            const res = await window.api.getMe();
            meData = res.user;
        } catch (e) {
            if (e?.status === 401) return;
            const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - session.timestamp > ONE_WEEK) { logout(); return; }
            enterDashboard(session.username, session.rank, session.avatarUrl);
            return;
        }
        enterDashboard(
            meData.username ?? session.username,
            (meData.role ?? session.rank).toUpperCase(),
            meData.avatar_url ?? session.avatarUrl,
        );
    } catch (e) {
        localStorage.removeItem('atlantic_staff_session');
    }
}

function logout() {
    window.api?.logout?.().catch(() => { });
    localStorage.removeItem('atlantic_staff_session');
    if (typeof isShiftActive !== 'undefined' && isShiftActive) {
        if (typeof stopShift === 'function') stopShift(true);
    }

    const dashboard = document.getElementById('dashboard');
    const gate = document.getElementById('login-gate');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const statusMsg = document.getElementById('status-msg');

    if (dashboard) {
        dashboard.classList.add('hidden');
        dashboard.innerHTML = '';
    }
    if (gate) {
        gate.classList.remove('hidden');
        gate.style.opacity = '1';
    }
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (statusMsg) statusMsg.classList.add('hidden');
}

// ─── Gate UI Helpers ────────────────────────────────────────────────────────
function showStatus(msg, type = 'neutral') {
    const statusMsg = document.getElementById('status-msg');
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.classList.remove('hidden', 'text-tac-red', 'text-tac-green', 'text-tac-amber', 'text-zinc-400', 'animate-pulse');
    const map = {
        error: 'text-tac-red',
        success: 'text-tac-green',
        loading: ['text-tac-amber', 'animate-pulse']
    };
    if (Array.isArray(map[type])) map[type].forEach(c => statusMsg.classList.add(c));
    else if (map[type]) statusMsg.classList.add(map[type]);
    else statusMsg.classList.add('text-zinc-400');
    statusMsg.classList.remove('hidden');
}

function resetLoginDelay() {
    setTimeout(() => {
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const statusMsg = document.getElementById('status-msg');
        if (step2) step2.classList.add('hidden');
        if (step1) step1.classList.remove('hidden');
        if (statusMsg) statusMsg.classList.add('hidden');
    }, 4000);
}

// ─── OAuth Flow ────────────────────────────────────────────────────────────
async function generateHWID() {
    const components = [
        navigator.userAgent,
        window.screen.width + 'x' + window.screen.height,
        window.screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        navigator.language
    ];
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125,1,62,20);
        ctx.fillStyle = "#069";
        ctx.fillText("Atlantic Staff", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Atlantic Staff", 4, 17);
        components.push(canvas.toDataURL());
    } catch(e) {}
    
    const raw = components.join('|');
    const msgBuffer = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function startRobloxOAuth() {
    const CLIENT_ID = '1185800266267472506';
    const SCOPES = 'openid profile';
    // Use state for CSRF protection in production
    const oauthUrl = `https://apis.roblox.com/oauth/v1/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code`;
    window.location.href = oauthUrl;
}

async function checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (!code) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.remove('hidden');

    showStatus('GERÄTE-VERIFIKATION...', 'loading');
    const hwid = await generateHWID();
    
    showStatus('TOKEN WIRD AUSGETAUSCHT...', 'loading');

    try {
        const { ok, data } = await window.api.login(code, REDIRECT_URI, hwid);
        if (!ok) throw new Error(data?.error || 'OAuth-Handshake fehlgeschlagen');
        if (!data.success || !data.user) throw new Error('Ungültige OAuth-Antwort');

        const { id: targetUserId, username: targetUsername, role: userRole, avatarUrl } = data.user;

        showStatus('ZUGRIFF GEWÄHRT. WILLKOMMEN.', 'success');
        const verifyText = document.getElementById('verify-text');
        if (verifyText) verifyText.textContent = 'ZUGRIFF GEWÄHRT';

        saveSession({ userId: targetUserId, username: targetUsername, rank: userRole.toUpperCase(), avatarUrl });
        setTimeout(() => enterDashboard(targetUsername, userRole.toUpperCase(), avatarUrl), 1000);
    } catch (err) {
        console.error('OAuth-Fehler:', err);
        showStatus('ANMELDUNG FEHLGESCHLAGEN: ' + (err.message || 'Unbekannter Fehler'), 'error');
        resetLoginDelay();
    }
}

// ─── Rank Verification Interval ────────────────────────────────────────────
// Called once after the dashboard loads. Every 5 minutes it asks the worker
// to re-check the user's current Roblox group rank. If the rank was removed,
// the worker returns 403 and the user is logged out automatically.
function startRankVerification() {
    const INTERVAL = 5 * 60 * 1000; // 5 minutes

    setInterval(async () => {
        try {
            await window.api.get('/staff/verify');
        } catch (e) {
            if (e?.status === 403 || e?.status === 404) {
                showToast('Dein Roblox-Gruppenrang wurde entfernt. Du wirst abgemeldet...', 'error');
                setTimeout(() => logout(), 3000);
            }
            // 401 is handled by api.js auto-refresh; ignore network errors (fail open)
        }
    }, INTERVAL);
}

// Export to window
window.auth = {
    startRobloxOAuth,
    checkOAuthCallback,
    checkSession,
    logout,
    showToast,
    saveSession,
    startRankVerification,
};

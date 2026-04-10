// assets/js/gamepanel.js

let gpCurrentPlayer = null;

// ── Staff Protection ──────────────────────────────────────────────────────────

const GP_ROLE_RANK = { OWNER: 4, ADMIN: 3, MOD: 2, TRAINEE: 1 };

let gpStaffMap     = null;   // { roblox_id (string) → role }
let gpStaffMapExp  = 0;

async function gpLoadStaffMap() {
    if (gpStaffMap !== null && Date.now() < gpStaffMapExp) return gpStaffMap;
    try {
        const data = await window.api.getRoster();
        gpStaffMap = {};
        (data.roster || []).forEach(s => { gpStaffMap[String(s.roblox_id)] = s.role; });
        gpStaffMapExp = Date.now() + 5 * 60 * 1000; // cache 5 min
    } catch {
        gpStaffMap = gpStaffMap || {}; // keep stale cache on error
    }
    return gpStaffMap;
}

async function gpApplyStaffProtection(robloxId) {
    const staffMap = await gpLoadStaffMap();
    const myRank   = GP_ROLE_RANK[window.currentRole] ?? 2;
    const targetRole = staffMap[String(robloxId)] ?? null;
    const targetRank = targetRole ? (GP_ROLE_RANK[targetRole] ?? 0) : 0;
    const canAct   = myRank > targetRank;

    const kickBtn  = document.getElementById('gp-btn-kick');
    const banBtn   = document.getElementById('gp-btn-ban');
    const unbanBtn = document.getElementById('gp-btn-unban');

    // Clear previous warning
    document.getElementById('gp-staff-warning')?.remove();

    if (!canAct && targetRole) {
        [kickBtn, banBtn, unbanBtn].forEach(btn => {
            if (!btn) return;
            btn.disabled = true;
            btn.classList.add('opacity-40', 'cursor-not-allowed');
            btn.onclick = null;
        });

        const actionsSection = document.getElementById('gp-player-section')?.querySelector('section:last-of-type');
        if (actionsSection) {
            const warn = document.createElement('div');
            warn.id = 'gp-staff-warning';
            warn.className = 'flex items-center gap-3 bg-tac-amber/5 border border-tac-amber/30 px-4 py-3 font-mono text-xs text-tac-amber';
            warn.innerHTML = `<i data-lucide="shield" class="w-4 h-4 flex-shrink-0"></i><span>STAFF-SCHUTZ AKTIV — Dieser Spieler ist ${escHtml(targetRole)} und kann von dir nicht sanktioniert werden.</span>`;
            actionsSection.insertAdjacentElement('beforebegin', warn);
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [warn] });
        }
    } else {
        // Re-enable (may have been disabled from a previous search)
        if (kickBtn)  { kickBtn.disabled  = false; kickBtn.classList.remove('opacity-40','cursor-not-allowed');  kickBtn.onclick  = () => openGpModal('modal-gp-kick'); }
        if (banBtn)   { banBtn.disabled   = false; banBtn.classList.remove('opacity-40','cursor-not-allowed');   banBtn.onclick   = () => openGpModal('modal-gp-ban'); }
        if (unbanBtn) { unbanBtn.disabled = false; unbanBtn.classList.remove('opacity-40','cursor-not-allowed'); unbanBtn.onclick = () => openGpModal('modal-gp-unban'); }
    }
}

function escHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function gpLookupPlayer() {
    const query = document.getElementById('gp-search-input').value.trim();
    if (!query) { showStatus && showStatus('Bitte einen Spielernamen oder eine ID eingeben.', 'error'); return; }

    document.getElementById('gp-search-hint').textContent = 'Suche läuft...';
    document.getElementById('gp-player-section').classList.add('hidden');

    try {
        const player = await window.api.lookupPlayer(query);
        gpCurrentPlayer = player;

        const avatar = document.getElementById('gp-player-avatar');
        avatar.src = player.avatarUrl || '';
        avatar.alt = player.username;
        document.getElementById('gp-player-display-name').textContent = player.displayName || player.username;
        document.getElementById('gp-player-username').textContent = '@' + player.username;
        document.getElementById('gp-player-id').textContent = player.id;
        const profileLink = document.getElementById('gp-player-profile-link');
        profileLink.href = player.profileUrl || `https://www.roblox.com/users/${player.id}/profile`;

        const bannedBadge = document.getElementById('gp-player-banned-badge');
        if (player.isBanned) bannedBadge.classList.remove('hidden');
        else bannedBadge.classList.add('hidden');

        const targetLabel = `${player.displayName || player.username} (@${player.username}) · ID ${player.id}`;
        document.getElementById('gp-kick-target').textContent = targetLabel;
        document.getElementById('gp-ban-target').textContent = targetLabel;
        document.getElementById('gp-unban-target').textContent = targetLabel;

        document.getElementById('gp-player-section').classList.remove('hidden');
        document.getElementById('gp-search-hint').textContent = 'Drücke Enter oder klicke Suchen';

        gpLoadRestriction(player.id);
        gpApplyStaffProtection(player.id);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        document.getElementById('gp-search-hint').textContent = 'Drücke Enter oder klicke Suchen';
        if (e.status === 404) showStatus('Spieler nicht gefunden.', 'error');
        else showStatus('Fehler: ' + e.message, 'error');
    }
}

async function gpLoadRestriction(userId) {
    const loading = document.getElementById('gp-restriction-loading');
    const content = document.getElementById('gp-restriction-content');
    loading.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        const data = await window.api.getCloudRestriction(userId);
        gpRenderRestriction(data);
    } catch (e) {
        content.innerHTML = `<div class="font-mono text-xs text-tac-red"><i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline"></i> Fehler beim Laden: ${escHtml(e.message)}</div>`;
        content.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [content] });
    } finally {
        loading.classList.add('hidden');
    }
}

// Parses ISO 8601 duration string (e.g. "P30D", "P1Y2M3DT4H5M6S") → milliseconds
function parseIso8601Duration(duration) {
    if (!duration) return null;
    const m = duration.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
    if (!m) return null;
    const years   = parseInt(m[1] || 0);
    const months  = parseInt(m[2] || 0);
    const days    = parseInt(m[3] || 0);
    const hours   = parseInt(m[4] || 0);
    const minutes = parseInt(m[5] || 0);
    const seconds = parseFloat(m[6] || 0);
    return ((years * 365 + months * 30 + days) * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
}

// Formats remaining milliseconds into a human-readable German string
function formatRemainingTime(ms) {
    if (ms <= 0) return 'Abgelaufen';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    if (d > 0) return `${d} Tag${d !== 1 ? 'e' : ''} ${h} Std.`;
    if (h > 0) return `${h} Std. ${min} Min.`;
    return `${min} Min.`;
}

function gpRenderRestriction(data) {
    const content = document.getElementById('gp-restriction-content');
    const active = data?.gameJoinRestriction?.active ?? false;
    const duration = data?.gameJoinRestriction?.duration ?? null;
    const startTime = data?.gameJoinRestriction?.startTime ?? null;
    const isPerm = !duration;
    const displayReason = data?.gameJoinRestriction?.displayReason ?? '–';
    const privateReason = data?.gameJoinRestriction?.privateReason ?? '–';

    if (!active) {
        content.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-tac-green flex-shrink-0"></div>
            <div>
                <div class="font-mono text-sm text-tac-green font-bold">NICHT GESPERRT</div>
                <div class="font-mono text-[10px] text-tac-muted mt-0.5">Kein aktiver Universe-Ban.</div>
            </div>
        </div>`;
    } else {
        let timeLabel = 'PERMANENT';
        if (!isPerm && startTime) {
            const durationMs = parseIso8601Duration(duration);
            if (durationMs !== null) {
                const endMs = new Date(startTime).getTime() + durationMs;
                const remaining = endMs - Date.now();
                timeLabel = remaining > 0 ? formatRemainingTime(remaining) + ' verbleibend' : 'Abgelaufen';
            }
        }

        content.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full bg-tac-red flex-shrink-0 mt-0.5"></div>
                <div class="font-mono text-sm text-tac-red font-bold">${isPerm ? 'PERMANENT GESPERRT' : 'TEMPORÄR GESPERRT'}</div>
            </div>
            <div class="font-mono text-xs text-tac-amber font-bold tracking-widest">${escHtml(timeLabel)}</div>
        </div>
        <div class="space-y-2">
            <div class="bg-tac-panel border border-tac-border p-3">
                <div class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-1">Öffentliche Begründung</div>
                <div class="font-mono text-xs text-zinc-300">${escHtml(displayReason)}</div>
            </div>
            <div class="bg-tac-panel border border-tac-border p-3">
                <div class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-1">Interne Begründung</div>
                <div class="font-mono text-xs text-zinc-300">${escHtml(privateReason)}</div>
            </div>
        </div>`;
    }
    content.classList.remove('hidden');
}

async function gpRefreshRestriction() {
    if (!gpCurrentPlayer) return;
    gpLoadRestriction(gpCurrentPlayer.id);
}

function openGpModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeGpModal(id) { document.getElementById(id).style.display = 'none'; }

async function executeGpKick() {
    if (!gpCurrentPlayer) return;
    const reason = document.getElementById('gp-kick-reason').value.trim();
    if (!reason) return showStatus('Begründung erforderlich', 'error');

    const btn = document.getElementById('gp-kick-submit');
    const orig = btn.textContent;
    btn.textContent = 'SENDET...'; btn.disabled = true;

    try {
        await window.api.cloudKick(gpCurrentPlayer.id, gpCurrentPlayer.username, reason);
        showStatus('Kick-Signal gesendet', 'success');
        closeGpModal('modal-gp-kick');
        document.getElementById('gp-kick-reason').value = '';
    } catch(e) {
        showStatus('Fehler beim Kick: ' + e.message, 'error');
    } finally {
        btn.textContent = orig; btn.disabled = false;
    }
}

async function executeGpBan() {
    if (!gpCurrentPlayer) return;
    const privateR = document.getElementById('gp-ban-reason').value.trim();
    const displayR = document.getElementById('gp-ban-display-reason').value.trim() || privateR;
    const durationRaw = document.getElementById('gp-ban-duration').value.trim();
    
    if (!privateR) return showStatus('Interne Begründung erforderlich', 'error');

    let durationIso = null;
    if (durationRaw) {
        const match = durationRaw.match(/^(\d+)([mhdyw])?$/i);
        if (match) {
            const val = match[1];
            const unit = (match[2] || 'd').toLowerCase();
            switch(unit) {
                case 'm': durationIso = `PT${val}M`; break;
                case 'h': durationIso = `PT${val}H`; break;
                case 'd': durationIso = `P${val}D`; break;
                case 'w': durationIso = `P${val}W`; break;
                case 'y': durationIso = `P${val}Y`; break;
            }
        } else if (!isNaN(parseInt(durationRaw))) {
             durationIso = `P${parseInt(durationRaw)}D`;
        }
    }

    const btn = document.getElementById('gp-ban-submit');
    const orig = btn.textContent;
    btn.textContent = 'SPERRT...'; btn.disabled = true;

    try {
        await window.api.cloudBan(gpCurrentPlayer.id, gpCurrentPlayer.username, privateR, displayR, durationIso);
        showStatus('Spieler gesperrt', 'success');
        closeGpModal('modal-gp-ban');
        document.getElementById('gp-ban-reason').value = '';
        document.getElementById('gp-ban-display-reason').value = '';
        document.getElementById('gp-ban-duration').value = '';
        gpRefreshRestriction();
    } catch(e) {
        showStatus('Fehler beim Bann: ' + e.message, 'error');
    } finally {
        btn.textContent = orig; btn.disabled = false;
    }
}

async function executeGpUnban() {
    if (!gpCurrentPlayer) return;

    const btn = document.getElementById('gp-unban-submit');
    const orig = btn.textContent;
    btn.textContent = 'HEBT AUF...'; btn.disabled = true;

    try {
        await window.api.cloudUnban(gpCurrentPlayer.id, gpCurrentPlayer.username);
        showStatus('Ban aufgehoben', 'success');
        closeGpModal('modal-gp-unban');
        gpRefreshRestriction();
    } catch(e) {
        showStatus('Fehler beim Unban: ' + e.message, 'error');
    } finally {
        btn.textContent = orig; btn.disabled = false;
    }
}

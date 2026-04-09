// assets/js/gamepanel.js

let gpCurrentPlayer = null;

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

function gpRenderRestriction(data) {
    const content = document.getElementById('gp-restriction-content');
    const active = data?.gameJoinRestriction?.active ?? false;
    const isPerm = !data?.gameJoinRestriction?.duration;
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
        content.innerHTML = `
        <div class="flex items-start gap-3 mb-4">
            <div class="w-3 h-3 rounded-full bg-tac-red flex-shrink-0 mt-0.5"></div>
            <div>
                <div class="font-mono text-sm text-tac-red font-bold">${isPerm ? 'PERMANENT GESPERRT' : 'TEMPORÄR GESPERRT'}</div>
            </div>
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
    const durationDays = parseInt(document.getElementById('gp-ban-duration').value);
    
    if (!privateR) return showStatus('Interne Begründung erforderlich', 'error');

    let durationIso = null;
    if (!isNaN(durationDays) && durationDays > 0) {
        durationIso = `P${durationDays}D`;
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

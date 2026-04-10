/**
 * notes.js – Personal Notes Widget + Server Power Operations
 * Loaded by team.html alongside other panel JS files.
 */

// ── Notes State ────────────────────────────────────────────────────────────────
let _notesOpen     = false;
let _notesDirty    = false;
let _notesDebounce = null;

// ── Init (called after login) ──────────────────────────────────────────────────
async function initNotes() {
    try {
        const data = await window.api.getNotes();
        document.getElementById('notes-text').value = data.content ?? '';
        renderPinnedTickets(data.pinnedTickets ?? []);
        updateNotesSavedAt(data.updatedAt);
    } catch (e) {
        console.warn('[Notes] Init failed:', e.message);
    }
    // Show the FAB after init
    const fab = document.getElementById('notes-fab');
    if (fab) fab.style.display = 'flex';
}

// ── Toggle Panel ───────────────────────────────────────────────────────────────
function toggleNotes() {
    const panel = document.getElementById('notes-panel');
    if (!panel) return;
    _notesOpen = !_notesOpen;
    if (_notesOpen) {
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        document.getElementById('notes-text')?.focus();
        lucide.createIcons({ nodes: [panel] });
    } else {
        panel.classList.add('hidden');
        panel.style.display = '';
        // Auto-save on close if dirty
        if (_notesDirty) saveNotes();
    }
}

// ── Dirty tracking ─────────────────────────────────────────────────────────────
function markNotesDirty() {
    _notesDirty = true;
    const statusEl = document.getElementById('notes-status');
    if (statusEl) statusEl.textContent = 'Nicht gespeichert…';

    clearTimeout(_notesDebounce);
    _notesDebounce = setTimeout(saveNotes, 2000); // Auto-save after 2s idle
}

// ── Save ───────────────────────────────────────────────────────────────────────
async function saveNotes() {
    if (!_notesDirty) return;
    const content = document.getElementById('notes-text')?.value ?? '';
    const statusEl = document.getElementById('notes-status');
    if (statusEl) statusEl.textContent = 'Speichern…';

    try {
        const data = await window.api.saveNotes(content);
        _notesDirty = false;
        if (statusEl) statusEl.textContent = 'Gespeichert';
        renderPinnedTickets(data.pinnedTickets ?? []);
        updateNotesSavedAt(new Date().toISOString());
    } catch (e) {
        if (statusEl) statusEl.textContent = 'Fehler beim Speichern';
        console.error('[Notes] Save error:', e.message);
    }
}

function updateNotesSavedAt(isoDate) {
    const el = document.getElementById('notes-saved-at');
    if (!el || !isoDate) return;
    el.textContent = new Date(isoDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// ── Render Pinned Tickets ──────────────────────────────────────────────────────
function renderPinnedTickets(pins) {
    const section = document.getElementById('notes-pins-section');
    const list    = document.getElementById('notes-pins');
    const badge   = document.getElementById('notes-pin-badge');

    if (!section || !list) return;

    if (badge) {
        if (pins.length > 0) {
            badge.textContent = String(pins.length);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (!pins.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    const typeColors = { BAN: '#ef4444', PERMBAN: '#7f1d1d', WARN: '#e2a800', KICK: '#3b82f6' };

    list.innerHTML = pins.map(p => `
        <div class="flex items-center gap-2 group">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${typeColors[p.type] ?? '#71717a'}"></span>
            <div class="flex-1 min-w-0">
                <span class="font-mono text-[9px] text-zinc-300 truncate block">${p.incidentId}</span>
                <span class="font-mono text-[9px] text-tac-muted">${p.targetUsername} · ${p.type}</span>
            </div>
            <button onclick="unpinTicket('${p.incidentId}')"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-tac-muted hover:text-tac-red p-0.5"
                title="Loslösen">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>`).join('');

    lucide.createIcons({ nodes: [list] });
}

// ── Pin / Unpin ────────────────────────────────────────────────────────────────
async function pinTicketToNotes(caseId, incidentId, type, targetUsername, createdAt) {
    try {
        const data = await window.api.pinTicket({ caseId, incidentId, type, targetUsername, createdAt });
        renderPinnedTickets(data.pinnedTickets ?? []);
        // Ensure notes panel shows current pins
        if (!_notesOpen) toggleNotes();
        showStatus && showStatus(`Fall ${incidentId} an Notizen angepinnt.`, 'success');
    } catch (e) {
        showStatus && showStatus(`Fehler beim Anheften: ${e.message}`, 'error');
    }
}

async function unpinTicket(incidentId) {
    try {
        const data = await window.api.unpinTicket(incidentId);
        renderPinnedTickets(data.pinnedTickets ?? []);
    } catch (e) {
        console.error('[Notes] Unpin error:', e.message);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVER POWER OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/** Called by shutdown button on each server card in the radar grid. */
async function confirmShutdownServer(jobId, playerCount) {
    if (!confirm(`Server (${jobId.slice(0, 8)}...) mit ${playerCount} Spieler(n) herunterfahren? Die Spieler werden getrennt.`)) return;
    try {
        await window.api.shutdownServer(jobId);
        showStatus && showStatus(`Shutdown-Signal gesendet.`, 'success');
    } catch (e) {
        showStatus && showStatus(`Fehler: ${e.message}`, 'error');
    }
}

/** Opens the Restart All confirmation modal. */
function confirmRestartAll() {
    const modal = document.getElementById('restart-confirm-modal');
    if (!modal) return;
    document.getElementById('restart-extra-protect').value = '';
    modal.classList.remove('hidden');
    lucide.createIcons({ nodes: [modal] });
}

function closeRestartConfirm() {
    const modal = document.getElementById('restart-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

async function executeRestartAll() {
    const raw = document.getElementById('restart-extra-protect')?.value ?? '';
    const extraProtectedJobIds = raw.split('\n').map(s => s.trim()).filter(Boolean);

    const btn = document.querySelector('#restart-confirm-modal button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = 'SENDE SIGNAL...'; }

    try {
        const data = await window.api.restartAllServers(extraProtectedJobIds);
        closeRestartConfirm();
        showStatus && showStatus(data.message ?? 'Restart-Signal gesendet.', 'success');
    } catch (e) {
        showStatus && showStatus(`Fehler: ${e.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'JETZT NEUSTARTEN'; }
    }
}

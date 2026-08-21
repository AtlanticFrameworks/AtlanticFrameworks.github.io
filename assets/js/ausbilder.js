/**
 * ausbilder.js – Ausbilder Notizen Panel (ausbilder.html)
 *
 * Verwaltet Ausbildungen: Teilnehmer, Strikes (Standard 3 = durchgefallen)
 * und Anmerkungen. Der komplette Zustand liegt im localStorage des Browsers –
 * es gibt bewusst kein Backend, damit die Seite ohne Login funktioniert.
 *
 * Aufbau:
 *   1. Konstanten & Helfer
 *   2. State: laden / speichern / Undo
 *   3. Ableitungen (Status, Statistik)
 *   4. Rendering
 *   5. Aktionen (Teilnehmer, Strikes, Status)
 *   6. Ausbildungen (anlegen, bearbeiten, abschließen, Archiv)
 *   7. Export
 *   8. Modals, Toasts, Tastenkürzel
 *   9. Init
 */
(function () {
    'use strict';

    // ══════════════════════════════════════════════════════════════════════
    // 1. KONSTANTEN & HELFER
    // ══════════════════════════════════════════════════════════════════════

    const STORAGE_KEY = 'bwrp_ausbilder_v1';
    const SAVE_DEBOUNCE = 400;
    const UNDO_LIMIT = 40;

    /** Häufige Strike-Gründe als Schnellauswahl im Strike-Dialog. */
    const STRIKE_REASONS = [
        'Verspätung',
        'Unaufmerksamkeit',
        'Fehlende Disziplin',
        'Falsche Ausrüstung',
        'Funkdisziplin',
        'Waffenhandhabung',
        'Befehl missachtet',
        'Formation verlassen',
        'Respektloses Verhalten',
        'Fehlendes Rollenspiel',
    ];

    const STATUS_LABEL = {
        aktiv: 'In Ausbildung',
        bestanden: 'Bestanden',
        durchgefallen: 'Durchgefallen',
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    /** HTML-Escape – jede Nutzereingabe läuft hier durch, bevor sie ins DOM geht. */
    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const fmtTime = (iso) =>
        new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const fmtDate = (iso) =>
        new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    function fmtDuration(ms) {
        if (ms < 0) ms = 0;
        const s = Math.floor(ms / 1000);
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${h}:${m}:${sec}`;
    }

    function fmtDurationShort(ms) {
        const min = Math.max(0, Math.round(ms / 60000));
        const h = Math.floor(min / 60);
        return h > 0 ? `${h} Std ${min % 60} Min` : `${min} Min`;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. STATE
    // ══════════════════════════════════════════════════════════════════════

    let state = {
        version: 1,
        activeId: null,
        sessions: [],
        ui: { filter: 'all', sort: 'added', density: 'normal' },
        lastInstructor: '',
    };

    let searchTerm = '';
    let saveTimer = null;
    let undoStack = [];
    const openLogs = new Set();   // Teilnehmer-IDs mit aufgeklapptem Verlauf

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sessions)) {
                state = Object.assign(state, parsed);
                state.ui = Object.assign({ filter: 'all', sort: 'added', density: 'normal' }, parsed.ui || {});
            }
        } catch (e) {
            console.warn('[Ausbilder] Gespeicherte Daten konnten nicht gelesen werden:', e);
            toast('Gespeicherte Daten sind beschädigt – es wurde neu gestartet.', 'err');
        }
    }

    function markDirty() {
        setSaveState('dirty', 'Speichert…');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, SAVE_DEBOUNCE);
    }

    function save() {
        clearTimeout(saveTimer);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            setSaveState('ok', 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        } catch (e) {
            setSaveState('err', 'Speichern fehlgeschlagen');
            toast('Speichern fehlgeschlagen – Browserspeicher voll?', 'err');
        }
    }

    function setSaveState(kind, text) {
        const chip = $('#save-chip');
        const label = $('#save-text');
        if (!chip || !label) return;
        chip.classList.toggle('dirty', kind === 'dirty');
        label.textContent = text;
    }

    /** Aktive Ausbildung oder null. */
    function session() {
        return state.sessions.find((s) => s.id === state.activeId) || null;
    }

    function participant(id) {
        const s = session();
        return s ? s.participants.find((p) => p.id === id) || null : null;
    }

    // ── Undo ──────────────────────────────────────────────────────────────
    function pushUndo(label) {
        const s = session();
        if (!s) return;
        undoStack.push({ label, id: s.id, snapshot: JSON.stringify(s) });
        if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    }

    function undo() {
        const entry = undoStack.pop();
        if (!entry) {
            toast('Nichts zum Rückgängigmachen.', 'err');
            return;
        }
        const idx = state.sessions.findIndex((s) => s.id === entry.id);
        if (idx === -1) {
            toast('Diese Ausbildung existiert nicht mehr.', 'err');
            return;
        }
        state.sessions[idx] = JSON.parse(entry.snapshot);
        state.activeId = entry.id;
        markDirty();
        renderAll();
        toast(`Rückgängig: ${entry.label}`);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. ABLEITUNGEN
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Status eines Teilnehmers.
     * Regel: Strike-Limit erreicht → durchgefallen. Der Ausbilder kann das
     * über "Bestanden" bewusst überschreiben (override).
     */
    function statusOf(p, s) {
        const max = s?.maxStrikes ?? 3;
        if (p.override === 'bestanden') return 'bestanden';
        if (p.strikes.length >= max) return 'durchgefallen';
        if (p.override === 'durchgefallen') return 'durchgefallen';
        return 'aktiv';
    }

    function isOverridden(p, s) {
        const max = s?.maxStrikes ?? 3;
        return p.override === 'bestanden' && p.strikes.length >= max;
    }

    function stats() {
        const s = session();
        const list = s ? s.participants : [];
        const out = { total: list.length, aktiv: 0, bestanden: 0, durchgefallen: 0, risiko: 0, strikes: 0 };
        list.forEach((p) => {
            const st = statusOf(p, s);
            out[st]++;
            out.strikes += p.strikes.length;
            // "Risiko": noch aktiv, aber nur noch ein Strike bis zum Durchfallen
            if (st === 'aktiv' && p.strikes.length >= (s.maxStrikes ?? 3) - 1) out.risiko++;
        });
        const bewertet = out.bestanden + out.durchgefallen;
        out.quote = bewertet ? Math.round((out.bestanden / bewertet) * 100) : null;
        return out;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. RENDERING
    // ══════════════════════════════════════════════════════════════════════

    function renderAll() {
        renderSessionHead();
        renderStats();
        renderRoster();
        if (window.lucide) lucide.createIcons();
    }

    function renderSessionHead() {
        const s = session();
        const meta = $('#session-meta');

        if (!s) {
            $('#session-title').textContent = 'Keine Ausbildung aktiv';
            $('#session-type').textContent = 'Ausbildung';
            meta.innerHTML = '<span>Lege oben rechts eine neue Ausbildung an.</span>';
            $('#session-timer').textContent = '--:--';
            return;
        }

        $('#session-title').textContent = s.title || 'Ausbildung';
        $('#session-type').textContent = s.type || 'Ausbildung';

        const parts = [];
        if (s.instructor) parts.push(`<span>Ausbilder: <b>${esc(s.instructor)}</b></span>`);
        if (s.location) parts.push(`<span>Ort: <b>${esc(s.location)}</b></span>`);
        parts.push(`<span>Datum: <b>${fmtDate(s.createdAt)}</b></span>`);
        parts.push(`<span>Beginn: <b>${fmtTime(s.createdAt)} Uhr</b></span>`);
        parts.push(`<span>Strike-Limit: <b>${s.maxStrikes}</b></span>`);
        if (s.endedAt) {
            parts.push(`<span style="color:var(--green);">● ABGESCHLOSSEN ${fmtTime(s.endedAt)} Uhr</span>`);
        }
        meta.innerHTML = parts.join('');

        updateTimer();
    }

    function updateTimer() {
        const s = session();
        const el = $('#session-timer');
        if (!el) return;
        if (!s) { el.textContent = '--:--'; return; }
        const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
        el.textContent = fmtDuration(end - new Date(s.createdAt).getTime());
        el.style.color = s.endedAt ? 'var(--green)' : 'var(--gold)';
    }

    function renderStats() {
        const st = stats();
        $('#stat-total').textContent = st.total;
        $('#stat-active').textContent = st.aktiv;
        $('#stat-passed').textContent = st.bestanden;
        $('#stat-failed').textContent = st.durchgefallen;
        $('#stat-strikes').textContent = st.strikes;
        $('#stat-rate').textContent = st.quote === null ? '–' : st.quote + '%';
        $('#stat-rate-bar').style.width = (st.quote ?? 0) + '%';

        $('#f-all').textContent = st.total;
        $('#f-aktiv').textContent = st.aktiv;
        $('#f-risiko').textContent = st.risiko;
        $('#f-bestanden').textContent = st.bestanden;
        $('#f-durchgefallen').textContent = st.durchgefallen;

        $$('#filters button').forEach((b) =>
            b.classList.toggle('active', b.dataset.filter === state.ui.filter));
        $('#sort-select').value = state.ui.sort;
        const compact = state.ui.density === 'compact';
        $('#roster').classList.toggle('compact', compact);
        $('#density-btn').classList.toggle('active', compact);
        $('#density-btn').title = compact ? 'Zur normalen Ansicht wechseln' : 'Kompakte Ansicht (ohne Anmerkungen)';
    }

    function visibleParticipants() {
        const s = session();
        if (!s) return [];
        const term = searchTerm.trim().toLowerCase();
        const max = s.maxStrikes ?? 3;

        let list = s.participants.filter((p) => {
            const st = statusOf(p, s);
            const f = state.ui.filter;
            if (f === 'aktiv' && st !== 'aktiv') return false;
            if (f === 'bestanden' && st !== 'bestanden') return false;
            if (f === 'durchgefallen' && st !== 'durchgefallen') return false;
            if (f === 'risiko' && !(st === 'aktiv' && p.strikes.length >= max - 1)) return false;

            if (!term) return true;
            const hay = [p.name, p.rank, p.notes, ...p.strikes.map((x) => x.reason)]
                .join(' ').toLowerCase();
            return hay.includes(term);
        });

        const order = { durchgefallen: 0, aktiv: 1, bestanden: 2 };
        const sort = state.ui.sort;
        if (sort === 'name') {
            list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
        } else if (sort === 'strikes') {
            list = list.slice().sort((a, b) => b.strikes.length - a.strikes.length);
        } else if (sort === 'status') {
            list = list.slice().sort((a, b) => order[statusOf(a, s)] - order[statusOf(b, s)]);
        }
        return list;
    }

    function renderRoster() {
        const root = $('#roster');
        const s = session();

        if (!s) {
            root.innerHTML = emptyState('clipboard-list', 'Noch keine Ausbildung',
                'Lege eine Ausbildung an, um Teilnehmer, Strikes und Anmerkungen zu erfassen.',
                '<button class="btn btn-gold" data-act="new-session"><i data-lucide="plus"></i>Ausbildung starten</button>');
            return;
        }
        if (!s.participants.length) {
            root.innerHTML = emptyState('user-plus', 'Keine Teilnehmer',
                'Trage oben den Roblox-Namen ein und drücke Enter – oder füge über „Liste einfügen“ mehrere Namen auf einmal ein.',
                '<button class="btn" data-act="open-import"><i data-lucide="clipboard-paste"></i>Liste einfügen</button>');
            return;
        }

        const list = visibleParticipants();
        if (!list.length) {
            root.innerHTML = emptyState('search-x', 'Kein Treffer',
                'Für die aktuelle Suche bzw. den gewählten Filter gibt es keine Teilnehmer.',
                '<button class="btn" data-act="clear-filter">Filter zurücksetzen</button>');
            return;
        }

        root.innerHTML = list.map((p) => cardHTML(p, s)).join('');
        $$('#roster textarea[data-act="notes"]').forEach(autoGrow);
    }

    function emptyState(icon, title, text, action) {
        return `<div class="empty">
            <i data-lucide="${icon}"></i>
            <h3>${esc(title)}</h3>
            <p>${esc(text)}</p>
            ${action || ''}
        </div>`;
    }

    function cardHTML(p, s) {
        const max = s.maxStrikes ?? 3;
        const st = statusOf(p, s);
        const num = s.participants.indexOf(p) + 1;
        const count = p.strikes.length;

        const badgeClass = st === 'bestanden' ? 'b-passed' : st === 'durchgefallen' ? 'b-failed'
            : count >= max - 1 ? 'b-risk' : 'b-active';
        const badgeText = st === 'aktiv' && count >= max - 1 ? 'Letzter Strike' : STATUS_LABEL[st];

        const pips = Array.from({ length: max }, (_, i) =>
            `<span class="pip ${i < count ? 'on' : ''}"></span>`).join('');

        const countClass = count >= max ? 'max' : count >= max - 1 ? 'warn' : '';

        const strikeItems = p.strikes.map((x, i) => `
            <li>
                <span class="s-num">${i + 1}</span>
                <span class="s-reason">${x.reason ? esc(x.reason) : '<i style="color:var(--muted);">ohne Angabe</i>'}</span>
                <span class="s-time">${fmtTime(x.at)}</span>
                <button class="icon-x" data-act="strike-del" data-id="${p.id}" data-sid="${x.id}" title="Diesen Strike entfernen">
                    <i data-lucide="x" style="width:0.75rem;height:0.75rem;"></i>
                </button>
            </li>`).join('');

        const logItems = p.log.slice().reverse().map((l) =>
            `<li><span>${fmtTime(l.at)}</span>${esc(l.text)}</li>`).join('');

        return `
        <article class="card st-${st === 'bestanden' ? 'passed' : st === 'durchgefallen' ? 'failed' : 'active'}" data-card="${p.id}">
            <div class="stamp">${st === 'bestanden' ? 'BESTANDEN' : 'DURCHGEFALLEN'}</div>

            <header class="card-head">
                <div class="card-ident">
                    <span class="idx">${String(num).padStart(2, '0')}</span>
                    <div style="min-width:0;">
                        <h3 class="card-name" data-act="edit-participant" data-id="${p.id}"
                            title="Name / Dienstgrad bearbeiten">${esc(p.name)}</h3>
                        <p class="card-sub">${p.rank ? esc(p.rank) : 'ohne Dienstgrad'} · seit ${fmtTime(p.createdAt)} Uhr${isOverridden(p, s) ? ' · manuell gewertet' : ''}</p>
                    </div>
                </div>
                <span class="badge ${badgeClass}">${badgeText}</span>
            </header>

            <div class="card-section">
                <div class="strike-row">
                    <span class="lbl">Strikes</span>
                    <div class="pips">${pips}</div>
                    <span class="pipcount ${countClass}">${count}/${max}</span>
                    <div class="strike-actions">
                        <button class="btn btn-red btn-sm" data-act="strike-add" data-id="${p.id}"
                            title="Strike vergeben (Shift+Klick = ohne Grund)">
                            <i data-lucide="plus"></i>Strike
                        </button>
                        <button class="btn btn-sm btn-icon" data-act="strike-undo" data-id="${p.id}"
                            title="Letzten Strike entfernen" ${count ? '' : 'disabled'}>
                            <i data-lucide="minus"></i>
                        </button>
                    </div>
                </div>
                ${count ? `<ul class="strike-list">${strikeItems}</ul>` : ''}
            </div>

            <div class="card-section card-notes">
                <span class="lbl">Anmerkungen</span>
                <textarea data-act="notes" data-id="${p.id}" rows="2"
                    placeholder="Leistung, Verhalten, Auffälligkeiten…">${esc(p.notes)}</textarea>
                <span class="note-hint">Wird automatisch gespeichert</span>
            </div>

            <details class="card-log" data-log="${p.id}" ${openLogs.has(p.id) ? 'open' : ''}>
                <summary>Verlauf (${p.log.length})</summary>
                <ol>${logItems || '<li>Keine Einträge</li>'}</ol>
            </details>

            <footer class="card-foot">
                ${st === 'bestanden'
                ? `<button class="btn btn-sm" data-act="reset" data-id="${p.id}"><i data-lucide="undo-2"></i>Zurücksetzen</button>`
                : `<button class="btn btn-green btn-sm" data-act="pass" data-id="${p.id}"><i data-lucide="check"></i>Bestanden</button>`}
                ${st === 'durchgefallen'
                ? `<button class="btn btn-sm" data-act="reset" data-id="${p.id}"><i data-lucide="undo-2"></i>Zurücksetzen</button>`
                : `<button class="btn btn-red btn-sm" data-act="fail" data-id="${p.id}"><i data-lucide="x"></i>Durchfallen</button>`}
                <span class="spacer"></span>
                <button class="btn btn-sm btn-icon" data-act="copy-one" data-id="${p.id}" title="Zusammenfassung kopieren">
                    <i data-lucide="copy"></i>
                </button>
                <button class="btn btn-sm btn-icon" data-act="remove" data-id="${p.id}" title="Teilnehmer entfernen">
                    <i data-lucide="trash-2"></i>
                </button>
            </footer>
        </article>`;
    }

    /** Karte kurz aufblitzen lassen (z. B. bei doppeltem Namen). */
    function flashCard(id) {
        const el = document.querySelector(`[data-card="${id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. AKTIONEN — TEILNEHMER, STRIKES, STATUS
    // ══════════════════════════════════════════════════════════════════════

    function logEvent(p, text) {
        p.log.push({ at: new Date().toISOString(), text });
    }

    function newParticipant(name, rank) {
        return {
            id: uid(),
            name: name.trim(),
            rank: (rank || '').trim(),
            notes: '',
            override: null,
            strikes: [],
            log: [{ at: new Date().toISOString(), text: 'Teilnehmer hinzugefügt' }],
            createdAt: new Date().toISOString(),
        };
    }

    function addParticipant(name, rank, opts = {}) {
        const s = session();
        if (!s) { toast('Lege zuerst eine Ausbildung an.', 'err'); return null; }
        name = (name || '').trim();
        if (!name) return null;

        const dupe = s.participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (dupe) {
            if (!opts.silent) {
                toast(`„${name}“ ist bereits in der Liste.`, 'err');
                renderRoster();
                if (window.lucide) lucide.createIcons();
                flashCard(dupe.id);
            }
            return null;
        }

        if (!opts.noUndo) pushUndo('Teilnehmer hinzugefügt');
        const p = newParticipant(name, rank);
        s.participants.push(p);
        markDirty();
        if (!opts.deferRender) { renderAll(); flashCard(p.id); }
        return p;
    }

    function removeParticipant(id) {
        const s = session();
        const p = participant(id);
        if (!s || !p) return;
        pushUndo('Teilnehmer entfernt');
        s.participants = s.participants.filter((x) => x.id !== id);
        markDirty();
        renderAll();
        toast(`„${p.name}“ entfernt.`, 'ok', { label: 'Rückgängig', fn: undo });
    }

    function commitStrike(id, reason) {
        const s = session();
        const p = participant(id);
        if (!s || !p) return;

        pushUndo('Strike vergeben');
        p.strikes.push({ id: uid(), reason: (reason || '').trim(), at: new Date().toISOString() });
        logEvent(p, `Strike ${p.strikes.length}/${s.maxStrikes}${reason ? ' – ' + reason : ''}`);

        const failed = p.strikes.length >= s.maxStrikes && p.override !== 'bestanden';
        if (failed) logEvent(p, 'Strike-Limit erreicht → durchgefallen');

        markDirty();
        renderAll();

        if (failed) {
            toast(`${p.name} hat ${s.maxStrikes}/${s.maxStrikes} Strikes – durchgefallen.`, 'err',
                { label: 'Rückgängig', fn: undo });
        } else {
            toast(`Strike ${p.strikes.length}/${s.maxStrikes} für ${p.name}.`, 'ok',
                { label: 'Rückgängig', fn: undo });
        }
    }

    function removeLastStrike(id) {
        const p = participant(id);
        if (!p || !p.strikes.length) return;
        pushUndo('Strike entfernt');
        const removed = p.strikes.pop();
        logEvent(p, `Strike entfernt${removed.reason ? ' – ' + removed.reason : ''}`);
        markDirty();
        renderAll();
        toast('Letzter Strike entfernt.', 'ok', { label: 'Rückgängig', fn: undo });
    }

    function removeStrikeById(pid, sid) {
        const p = participant(pid);
        if (!p) return;
        const strike = p.strikes.find((x) => x.id === sid);
        if (!strike) return;
        pushUndo('Strike entfernt');
        p.strikes = p.strikes.filter((x) => x.id !== sid);
        logEvent(p, `Strike entfernt${strike.reason ? ' – ' + strike.reason : ''}`);
        markDirty();
        renderAll();
    }

    function setOverride(id, value) {
        const s = session();
        const p = participant(id);
        if (!s || !p) return;
        pushUndo('Status geändert');
        p.override = value;
        const st = statusOf(p, s);
        logEvent(p, value === null ? 'Status zurückgesetzt' : `Status: ${STATUS_LABEL[st]}`);
        markDirty();
        renderAll();

        if (value === null && st !== 'aktiv') {
            toast(`${p.name} bleibt „${STATUS_LABEL[st]}“ – Strike-Limit ist erreicht.`, 'err');
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. AUSBILDUNGEN
    // ══════════════════════════════════════════════════════════════════════

    let setupMode = 'new';   // 'new' | 'edit'
    let pendingRoster = null; // Teilnehmer, die in die neue Ausbildung übernommen werden

    function openSetup(mode) {
        setupMode = mode;
        const s = session();
        const editing = mode === 'edit' && s;

        $('#setup-title').textContent = editing ? 'Ausbildung bearbeiten' : 'Neue Ausbildung';
        $('#setup-save').textContent = editing ? 'Speichern' : 'Ausbildung starten';

        const now = new Date();
        $('#s-title').value = editing ? s.title
            : `Ausbildung ${now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
        $('#s-type').value = editing ? s.type : 'Grundausbildung';
        $('#s-instructor').value = editing ? s.instructor : (state.lastInstructor || '');
        $('#s-location').value = editing ? s.location : '';
        $('#s-maxstrikes').value = editing ? s.maxStrikes : 3;

        openModal('modal-setup');
        setTimeout(() => $('#s-title').select(), 60);
    }

    function saveSetup() {
        const title = $('#s-title').value.trim() || 'Ausbildung';
        const type = $('#s-type').value.trim() || 'Ausbildung';
        const instructor = $('#s-instructor').value.trim();
        const location = $('#s-location').value.trim();
        let maxStrikes = parseInt($('#s-maxstrikes').value, 10);
        if (!Number.isFinite(maxStrikes) || maxStrikes < 1) maxStrikes = 3;
        if (maxStrikes > 10) maxStrikes = 10;

        state.lastInstructor = instructor;

        if (setupMode === 'edit' && session()) {
            const s = session();
            pushUndo('Ausbildung bearbeitet');
            Object.assign(s, { title, type, instructor, location, maxStrikes });
        } else {
            const s = {
                id: uid(),
                title, type, instructor, location, maxStrikes,
                createdAt: new Date().toISOString(),
                endedAt: null,
                participants: [],
            };
            state.sessions.unshift(s);
            state.activeId = s.id;
            undoStack = [];
            if (pendingRoster) {
                pendingRoster.forEach((r) => s.participants.push(newParticipant(r.name, r.rank)));
                toast(`${pendingRoster.length} Teilnehmer übernommen.`, 'ok');
                pendingRoster = null;
            }
        }

        markDirty();
        closeModals();
        renderAll();
        if (setupMode !== 'edit') setTimeout(() => $('#add-name').focus(), 80);
    }

    function finishSession() {
        const s = session();
        if (!s) return;
        const st = stats();

        if (s.endedAt) {
            confirmDialog('Ausbildung wieder öffnen', 'Abschluss aufheben',
                `„${s.title}“ ist bereits abgeschlossen. Möchtest du sie wieder öffnen, um Korrekturen vorzunehmen?`,
                '', () => {
                    pushUndo('Abschluss aufgehoben');
                    s.endedAt = null;
                    markDirty();
                    renderAll();
                    toast('Ausbildung wieder geöffnet.');
                });
            return;
        }

        const extra = st.aktiv > 0
            ? `<label style="display:flex;gap:0.6rem;align-items:flex-start;margin-top:1rem;font-size:0.8125rem;color:var(--text-2);cursor:pointer;">
                   <input type="checkbox" id="finish-pass-rest" checked style="width:auto;margin-top:0.15rem;">
                   <span>Die <b>${st.aktiv}</b> noch aktiven Teilnehmer als <b style="color:var(--green);">bestanden</b> werten</span>
               </label>`
            : '';

        confirmDialog('Ausbildung abschließen', 'Protokoll finalisieren',
            `${st.total} Teilnehmer · ${st.bestanden} bestanden · ${st.durchgefallen} durchgefallen. ` +
            `Die Ausbildung wird ins Archiv gelegt und die Laufzeit gestoppt.`,
            extra, () => {
                pushUndo('Ausbildung abgeschlossen');
                const passRest = $('#finish-pass-rest')?.checked;
                if (passRest) {
                    s.participants.forEach((p) => {
                        if (statusOf(p, s) === 'aktiv') {
                            p.override = 'bestanden';
                            logEvent(p, 'Beim Abschluss als bestanden gewertet');
                        }
                    });
                }
                s.endedAt = new Date().toISOString();
                markDirty();
                renderAll();
                toast('Ausbildung abgeschlossen. Jetzt exportieren?', 'ok',
                    { label: 'Export', fn: openExport });
            });
    }

    function renderArchive() {
        const box = $('#arch-list');
        if (!state.sessions.length) {
            box.innerHTML = '<div class="info-box">Noch keine Ausbildungen vorhanden.</div>';
            return;
        }
        box.innerHTML = state.sessions.map((s) => {
            const total = s.participants.length;
            const failed = s.participants.filter((p) => statusOf(p, s) === 'durchgefallen').length;
            const passed = s.participants.filter((p) => statusOf(p, s) === 'bestanden').length;
            const isCurrent = s.id === state.activeId;
            return `<div class="arch-item ${isCurrent ? 'current' : ''}">
                <div style="flex:1;min-width:12rem;">
                    <h4>${esc(s.title)}${isCurrent ? ' <span class="badge b-risk">Aktiv</span>' : ''}</h4>
                    <p>${esc(s.type)} · ${fmtDate(s.createdAt)} · ${total} Teilnehmer ·
                       <span style="color:var(--green);">${passed} bestanden</span> ·
                       <span style="color:var(--red);">${failed} durchgefallen</span>
                       ${s.endedAt ? '· abgeschlossen' : '· läuft'}</p>
                </div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                    ${isCurrent ? '' : `<button class="btn btn-sm" data-act="arch-open" data-sid="${s.id}"><i data-lucide="folder-open"></i>Öffnen</button>`}
                    <button class="btn btn-sm" data-act="arch-reuse" data-sid="${s.id}" title="Neue Ausbildung mit denselben Teilnehmern">
                        <i data-lucide="users"></i>Roster
                    </button>
                    <button class="btn btn-sm btn-icon" data-act="arch-del" data-sid="${s.id}" title="Löschen">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. EXPORT
    // ══════════════════════════════════════════════════════════════════════

    let exportFormat = 'discord';

    function sessionDuration(s) {
        const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
        return fmtDurationShort(end - new Date(s.createdAt).getTime());
    }

    function buildDiscord(s) {
        const st = stats();
        const group = (status) => s.participants.filter((p) => statusOf(p, s) === status);
        const line = (p) => {
            const bits = [`• **${p.name}**${p.rank ? ` (${p.rank})` : ''} — ${p.strikes.length}/${s.maxStrikes} Strikes`];
            if (p.strikes.length) {
                const reasons = p.strikes.map((x) => x.reason || 'ohne Angabe').join(', ');
                bits.push(`  ↳ Strikes: ${reasons}`);
            }
            if (p.notes.trim()) bits.push(`  ↳ Anmerkung: ${p.notes.trim().replace(/\s*\n\s*/g, ' | ')}`);
            return bits.join('\n');
        };

        const out = [];
        out.push(`**AUSBILDUNGSPROTOKOLL — ${s.title.toUpperCase()}**`);
        out.push(`\`${s.type}\` · Ausbilder: ${s.instructor || '—'}${s.location ? ' · Ort: ' + s.location : ''}`);
        out.push(`Datum: ${fmtDate(s.createdAt)} · Beginn ${fmtTime(s.createdAt)} Uhr · Dauer: ${sessionDuration(s)}`);
        out.push('');
        out.push(`Teilnehmer: **${st.total}** · Bestanden: **${st.bestanden}** · Durchgefallen: **${st.durchgefallen}**` +
            (st.quote === null ? '' : ` · Quote: **${st.quote}%**`));

        const passed = group('bestanden');
        const failed = group('durchgefallen');
        const active = group('aktiv');

        if (passed.length) { out.push('', `✅ **BESTANDEN (${passed.length})**`, passed.map(line).join('\n')); }
        if (failed.length) { out.push('', `❌ **DURCHGEFALLEN (${failed.length})**`, failed.map(line).join('\n')); }
        if (active.length) { out.push('', `⏳ **NOCH IN AUSBILDUNG (${active.length})**`, active.map(line).join('\n')); }

        return out.join('\n');
    }

    function buildText(s) {
        return buildDiscord(s).replace(/\*\*/g, '').replace(/`/g, '');
    }

    function buildCSV(s) {
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Name', 'Dienstgrad', 'Strikes', 'Limit', 'Status', 'Strike-Gründe', 'Anmerkungen', 'Hinzugefügt']
            .map(q).join(';')];
        s.participants.forEach((p) => {
            rows.push([
                p.name, p.rank, p.strikes.length, s.maxStrikes, STATUS_LABEL[statusOf(p, s)],
                p.strikes.map((x) => x.reason || 'ohne Angabe').join(' | '),
                p.notes.replace(/\s*\n\s*/g, ' | '),
                fmtDate(p.createdAt) + ' ' + fmtTime(p.createdAt),
            ].map(q).join(';'));
        });
        return rows.join('\r\n');
    }

    function buildExport(fmt) {
        const s = session();
        if (!s) return 'Keine Ausbildung aktiv.';
        if (fmt === 'discord') return buildDiscord(s);
        if (fmt === 'text') return buildText(s);
        if (fmt === 'csv') return buildCSV(s);
        return JSON.stringify(s, null, 2);
    }

    function refreshExport() {
        const text = buildExport(exportFormat);
        $('#export-out').value = text;
        $('#export-count').textContent = `${text.length} Zeichen`;
        const hint = $('#export-hint');
        if (exportFormat === 'discord' && text.length > 1900) {
            hint.textContent = '⚠ Über 2000 Zeichen – Discord-Limit, in zwei Nachrichten aufteilen';
            hint.style.color = 'var(--red)';
        } else if (exportFormat === 'csv') {
            hint.textContent = 'Semikolon-getrennt – direkt in Excel/Sheets nutzbar';
            hint.style.color = '';
        } else {
            hint.textContent = '';
        }
        $$('#export-tabs button').forEach((b) =>
            b.classList.toggle('active', b.dataset.format === exportFormat));
    }

    function openExport() {
        if (!session()) { toast('Keine Ausbildung aktiv.', 'err'); return; }
        refreshExport();
        openModal('modal-export');
    }

    async function copyText(text, okMsg) {
        try {
            await navigator.clipboard.writeText(text);
            toast(okMsg || 'In die Zwischenablage kopiert.', 'ok');
        } catch (e) {
            // Fallback für Browser ohne Clipboard-API bzw. ohne Berechtigung
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            toast(ok ? (okMsg || 'In die Zwischenablage kopiert.') : 'Kopieren nicht möglich – bitte manuell markieren.',
                ok ? 'ok' : 'err');
        }
    }

    function downloadExport() {
        const s = session();
        if (!s) return;
        const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'json' ? 'json' : 'txt';
        const text = buildExport(exportFormat);
        const body = exportFormat === 'csv' ? '﻿' + text : text;   // BOM für Excel
        const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
        const safeTitle = s.title.replace(/[^\w\säöüÄÖÜß-]/g, '').trim().replace(/\s+/g, '_') || 'ausbildung';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${safeTitle}_${new Date(s.createdAt).toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Datei gespeichert.', 'ok');
    }

    function copyParticipant(id) {
        const s = session();
        const p = participant(id);
        if (!s || !p) return;
        const lines = [
            `${p.name}${p.rank ? ` (${p.rank})` : ''} — ${STATUS_LABEL[statusOf(p, s)]} — ${p.strikes.length}/${s.maxStrikes} Strikes`,
        ];
        p.strikes.forEach((x, i) => lines.push(`  ${i + 1}. ${x.reason || 'ohne Angabe'} (${fmtTime(x.at)} Uhr)`));
        if (p.notes.trim()) lines.push(`  Anmerkung: ${p.notes.trim()}`);
        copyText(lines.join('\n'), `Zusammenfassung von ${p.name} kopiert.`);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 8. MODALS, TOASTS, IMPORT, TASTENKÜRZEL
    // ══════════════════════════════════════════════════════════════════════

    function openModal(id) {
        closeModals();
        const m = document.getElementById(id);
        if (!m) return;
        m.classList.add('open');
        document.body.style.overflow = 'hidden';   // Hintergrund nicht mitscrollen
        if (window.lucide) lucide.createIcons({ nodes: [m] });
    }

    function closeModals() {
        $$('.modal.open').forEach((m) => m.classList.remove('open'));
        document.body.style.overflow = '';
    }

    let confirmCb = null;

    function confirmDialog(title, sub, text, extraHTML, cb) {
        $('#confirm-title').textContent = title;
        $('#confirm-sub').textContent = sub;
        $('#confirm-text').textContent = text;
        $('#confirm-extra').innerHTML = extraHTML || '';
        confirmCb = cb;
        openModal('modal-confirm');
    }

    function toast(msg, kind, action) {
        const box = $('#toasts');
        const el = document.createElement('div');
        el.className = 'toast' + (kind ? ' ' + kind : '');
        el.innerHTML = `<span class="msg">${esc(msg)}</span>`;
        if (action) {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.addEventListener('click', () => { action.fn(); dismiss(); });
            el.appendChild(btn);
        }
        box.appendChild(el);

        let timer = setTimeout(dismiss, action ? 7000 : 3500);
        function dismiss() {
            clearTimeout(timer);
            if (!el.isConnected) return;
            el.classList.add('out');
            setTimeout(() => el.remove(), 250);
        }
        el.addEventListener('mouseenter', () => clearTimeout(timer));
        el.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 2000); });
    }

    // ── Strike-Dialog ─────────────────────────────────────────────────────
    let strikeTargetId = null;
    const selectedReasons = new Set();

    function openStrikeDialog(id) {
        const s = session();
        const p = participant(id);
        if (!s || !p) return;

        strikeTargetId = id;
        selectedReasons.clear();
        $('#strike-reason').value = '';
        $('#strike-target').textContent = `${p.name} · ${p.strikes.length}/${s.maxStrikes} Strikes`;

        $('#strike-chips').innerHTML = STRIKE_REASONS
            .map((r) => `<button type="button" class="chip" data-reason="${esc(r)}">${esc(r)}</button>`).join('');

        const willFail = p.strikes.length + 1 >= s.maxStrikes && p.override !== 'bestanden';
        $('#strike-warn').style.display = willFail ? 'flex' : 'none';
        $('#strike-warn-text').textContent =
            `Dieser Strike ist der ${p.strikes.length + 1}. von ${s.maxStrikes} – ${p.name} gilt damit als durchgefallen.`;

        openModal('modal-strike');
        setTimeout(() => $('#strike-reason').focus(), 60);
    }

    function confirmStrike() {
        const custom = $('#strike-reason').value.trim();
        const reason = [...selectedReasons, ...(custom ? [custom] : [])].join(', ');
        const id = strikeTargetId;
        closeModals();
        if (id) commitStrike(id, reason);
        strikeTargetId = null;
    }

    // ── Teilnehmer bearbeiten ─────────────────────────────────────────────
    let editTargetId = null;

    function openEdit(id) {
        const p = participant(id);
        if (!p) return;
        editTargetId = id;
        $('#edit-name').value = p.name;
        $('#edit-rank').value = p.rank;
        openModal('modal-edit');
        setTimeout(() => $('#edit-name').select(), 60);
    }

    function saveEdit() {
        const s = session();
        const p = participant(editTargetId);
        if (!s || !p) { closeModals(); return; }

        const name = $('#edit-name').value.trim();
        const rank = $('#edit-rank').value.trim();
        if (!name) { toast('Der Name darf nicht leer sein.', 'err'); return; }

        const clash = s.participants.find((x) =>
            x.id !== p.id && x.name.toLowerCase() === name.toLowerCase());
        if (clash) { toast(`„${name}“ ist bereits vergeben.`, 'err'); return; }

        if (name === p.name && rank === p.rank) { closeModals(); return; }

        pushUndo('Teilnehmer bearbeitet');
        if (name !== p.name) logEvent(p, `Name geändert: ${p.name} → ${name}`);
        if (rank !== p.rank) logEvent(p, `Dienstgrad: ${rank || 'entfernt'}`);
        p.name = name;
        p.rank = rank;

        editTargetId = null;
        closeModals();
        markDirty();
        renderAll();
        toast('Teilnehmer aktualisiert.', 'ok', { label: 'Rückgängig', fn: undo });
    }

    // ── Listen-Import ─────────────────────────────────────────────────────
    function runImport() {
        const raw = $('#import-text').value;
        const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) { closeModals(); return; }
        if (!session()) { toast('Lege zuerst eine Ausbildung an.', 'err'); return; }

        pushUndo('Liste importiert');
        let added = 0, skipped = 0;

        lines.forEach((line) => {
            // Aufzählungszeichen / Nummerierung entfernen
            let clean = line.replace(/^[\s>*•\-–—]*\d+[.)]?\s*/, '').replace(/^[\s>*•\-–—]+/, '').trim();
            if (!clean) return;

            // Dienstgrad hinter Komma / Bindestrich / Pipe
            let name = clean, rank = '';
            const m = clean.match(/^(.+?)\s*[,|]\s*(.+)$/) || clean.match(/^(.+?)\s+[-–—]\s+(.+)$/);
            if (m) { name = m[1].trim(); rank = m[2].trim(); }

            const p = addParticipant(name, rank, { silent: true, noUndo: true, deferRender: true });
            if (p) added++; else skipped++;
        });

        closeModals();
        $('#import-text').value = '';
        markDirty();
        renderAll();
        toast(`${added} Teilnehmer hinzugefügt${skipped ? `, ${skipped} übersprungen (Duplikate)` : ''}.`,
            added ? 'ok' : 'err', added ? { label: 'Rückgängig', fn: undo } : null);
    }

    // ── Textarea automatisch mitwachsen lassen ────────────────────────────
    function autoGrow(ta) {
        // Ausgeblendete Felder (kompakte Ansicht) melden scrollHeight 0 –
        // dann würde die Höhe fälschlich auf 0 gesetzt.
        if (!ta.offsetParent) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight + 2, 200) + 'px';
    }

    // ══════════════════════════════════════════════════════════════════════
    // EVENT-DELEGATION
    // ══════════════════════════════════════════════════════════════════════

    document.addEventListener('click', (ev) => {
        // Modal per Klick auf den Hintergrund schließen
        if (ev.target.classList?.contains('modal')) { closeModals(); return; }

        const chip = ev.target.closest('.chip[data-reason]');
        if (chip) {
            const r = chip.dataset.reason;
            if (selectedReasons.has(r)) { selectedReasons.delete(r); chip.classList.remove('sel'); }
            else { selectedReasons.add(r); chip.classList.add('sel'); }
            return;
        }

        const tab = ev.target.closest('#export-tabs button');
        if (tab) { exportFormat = tab.dataset.format; refreshExport(); return; }

        const filterBtn = ev.target.closest('#filters button');
        if (filterBtn) {
            state.ui.filter = filterBtn.dataset.filter;
            markDirty(); renderStats(); renderRoster();
            if (window.lucide) lucide.createIcons();
            return;
        }

        const btn = ev.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const sid = btn.dataset.sid;

        switch (act) {
            case 'add-participant': {
                const name = $('#add-name').value;
                const rank = $('#add-rank').value;
                if (!name.trim()) { $('#add-name').focus(); return; }
                if (addParticipant(name, rank)) {
                    $('#add-name').value = '';
                    $('#add-name').focus();
                }
                break;
            }
            case 'strike-add':
                if (ev.shiftKey) commitStrike(id, '');   // Shortcut: ohne Grund-Dialog
                else openStrikeDialog(id);
                break;
            case 'strike-undo': removeLastStrike(id); break;
            case 'strike-del': removeStrikeById(id, sid); break;
            case 'confirm-strike': confirmStrike(); break;
            case 'pass': setOverride(id, 'bestanden'); break;
            case 'fail': setOverride(id, 'durchgefallen'); break;
            case 'reset': setOverride(id, null); break;
            case 'copy-one': copyParticipant(id); break;
            case 'remove': removeParticipant(id); break;
            case 'edit-participant': openEdit(id); break;
            case 'save-edit': saveEdit(); break;

            case 'new-session': pendingRoster = null; openSetup('new'); break;
            case 'edit-session':
                if (!session()) { openSetup('new'); } else { openSetup('edit'); }
                break;
            case 'save-session': saveSetup(); break;
            case 'finish-session':
                if (!session()) { toast('Keine Ausbildung aktiv.', 'err'); break; }
                finishSession();
                break;

            case 'open-import':
                if (!session()) { toast('Lege zuerst eine Ausbildung an.', 'err'); break; }
                openModal('modal-import');
                setTimeout(() => $('#import-text').focus(), 60);
                break;
            case 'confirm-import': runImport(); break;

            case 'open-export': openExport(); break;
            case 'copy-export': copyText($('#export-out').value, 'Protokoll kopiert.'); break;
            case 'download-export': downloadExport(); break;

            case 'open-archive': renderArchive(); openModal('modal-archive'); break;
            case 'arch-open':
                state.activeId = sid;
                undoStack = [];
                markDirty(); closeModals(); renderAll();
                toast('Ausbildung geöffnet.');
                break;
            case 'arch-reuse': {
                const src = state.sessions.find((s) => s.id === sid);
                if (!src) break;
                pendingRoster = src.participants.map((p) => ({ name: p.name, rank: p.rank }));
                closeModals();
                openSetup('new');
                $('#s-title').value = `${src.type || 'Ausbildung'} ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
                $('#s-type').value = src.type || '';
                $('#s-location').value = src.location || '';
                $('#s-maxstrikes').value = src.maxStrikes || 3;
                break;
            }
            case 'arch-del': {
                const src = state.sessions.find((s) => s.id === sid);
                if (!src) break;
                confirmDialog('Ausbildung löschen', 'Nicht umkehrbar',
                    `„${src.title}“ mit ${src.participants.length} Teilnehmern endgültig löschen? Diese Aktion lässt sich nicht rückgängig machen.`,
                    '', () => {
                        state.sessions = state.sessions.filter((s) => s.id !== sid);
                        if (state.activeId === sid) state.activeId = state.sessions[0]?.id ?? null;
                        markDirty(); renderAll(); renderArchive(); openModal('modal-archive');
                        toast('Ausbildung gelöscht.', 'ok');
                    });
                break;
            }

            case 'open-help': openModal('modal-help'); break;
            case 'close-modal': closeModals(); break;
            case 'confirm-yes': {
                const cb = confirmCb;
                confirmCb = null;
                closeModals();
                if (cb) cb();
                break;
            }
            case 'clear-filter':
                state.ui.filter = 'all';
                searchTerm = '';
                $('#search').value = '';
                markDirty(); renderStats(); renderRoster();
                if (window.lucide) lucide.createIcons();
                break;
            case 'toggle-density':
                state.ui.density = state.ui.density === 'compact' ? 'normal' : 'compact';
                markDirty();
                renderStats();
                renderRoster();          // Notizfelder neu vermessen
                if (window.lucide) lucide.createIcons();
                toast(state.ui.density === 'compact' ? 'Kompakte Ansicht' : 'Normale Ansicht');
                break;
            case 'print': window.print(); break;
        }
    });

    // Notizen: Eingabe speichern, ohne neu zu rendern (Fokus bleibt erhalten)
    document.addEventListener('input', (ev) => {
        const ta = ev.target;
        if (ta.dataset?.act === 'notes') {
            const p = participant(ta.dataset.id);
            if (!p) return;
            p.notes = ta.value;
            autoGrow(ta);
            markDirty();
        }
    });

    // Verlauf auf-/zuklappen merken (überlebt ein Re-Render)
    document.addEventListener('toggle', (ev) => {
        const el = ev.target;
        if (!el.dataset?.log) return;
        if (el.open) openLogs.add(el.dataset.log); else openLogs.delete(el.dataset.log);
    }, true);

    // ── Tastatur ──────────────────────────────────────────────────────────
    document.addEventListener('keydown', (ev) => {
        const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
        const modalOpen = !!$('.modal.open');

        if (ev.key === 'Escape') { closeModals(); return; }

        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
            ev.preventDefault(); save(); toast('Gespeichert.', 'ok'); return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !inField) {
            ev.preventDefault(); undo(); return;
        }

        if (modalOpen) {
            // Enter bestätigt den jeweiligen Dialog
            if (ev.key === 'Enter' && !ev.shiftKey) {
                if ($('#modal-strike').classList.contains('open')) { ev.preventDefault(); confirmStrike(); }
                else if ($('#modal-edit').classList.contains('open')) { ev.preventDefault(); saveEdit(); }
                else if ($('#modal-setup').classList.contains('open') && ev.target.tagName === 'INPUT') { ev.preventDefault(); saveSetup(); }
                else if ($('#modal-confirm').classList.contains('open')) { ev.preventDefault(); $('#confirm-ok').click(); }
            }
            return;
        }

        if (inField) return;

        if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); $('#add-name').focus(); }
        else if (ev.key === '/') { ev.preventDefault(); $('#search').focus(); }
        else if (ev.key === '?') { ev.preventDefault(); openModal('modal-help'); }
    });

    // ══════════════════════════════════════════════════════════════════════
    // 9. INIT
    // ══════════════════════════════════════════════════════════════════════

    function init() {
        load();

        // Enter im Namensfeld = hinzufügen, Tab-freies Schnellerfassen
        $('#add-name').addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                document.querySelector('[data-act="add-participant"]').click();
            }
        });
        $('#add-rank').addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                document.querySelector('[data-act="add-participant"]').click();
            }
        });

        $('#search').addEventListener('input', (ev) => {
            searchTerm = ev.target.value;
            renderRoster();
            if (window.lucide) lucide.createIcons();
        });

        $('#sort-select').addEventListener('change', (ev) => {
            state.ui.sort = ev.target.value;
            markDirty();
            renderRoster();
            if (window.lucide) lucide.createIcons();
        });

        renderAll();
        setSaveState('ok', state.sessions.length ? 'Geladen' : 'Bereit');

        // Laufzeit-Anzeige
        setInterval(updateTimer, 1000);

        // Notizfelder nach Größenänderung neu anpassen (Handy-Drehung, Fenstergröße)
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                $$('#roster textarea[data-act="notes"]').forEach(autoGrow);
            }, 150);
        });

        // Ausstehende Änderungen beim Verlassen/Wegschalten sichern
        window.addEventListener('beforeunload', save);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') save();
        });

        // Beim allerersten Aufruf direkt die Einrichtung öffnen
        if (!state.sessions.length) openSetup('new');
        else $('#add-name').focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

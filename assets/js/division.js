/**
 * division.js – /division page logic
 * Picker → per-division tabs (Übersicht/Mitglieder/Abmeldung/Strikes/Erscheinungsbild[/Divisionsleitung]).
 *
 * /division has its OWN lightweight login, separate from the staff session
 * team.html/dev.html use — most division members aren't staff at all, so the
 * staff login's Roblox-group-rank gate would lock almost everyone out. Anyone
 * who completes Roblox OAuth can get a division session; the worker decides
 * what they can do by matching their Roblox ID against the division's
 * roster/leads, not by rank. See DivisionController.ts for the backend side.
 *
 * Still reuses assets/js/auth.js for the generic bits (startRobloxOAuth() to
 * build the Roblox authorize URL, showToast/friendlyApiError) and the
 * bwrp_oauth_return forwarding trick (the OAuth app only has /team registered
 * as a redirect URI) — but NOT auth.js's checkOAuthCallback()/checkSession(),
 * since those call the staff login endpoint. This file has its own equivalents.
 */

// ─── Static fallback (mirrors worker/schema.sql seed) ─────────────────────────
// Icons are fixed to what's shown on divisions.html — Divisionsleitung cannot change them.
const FALLBACK_DIVISIONS = [
    { slug: 'ksk', name: 'KSK', color: '#E2B007', icon: 'crosshair', description: 'Eliteeinheit für spezielle Operationen.', sub_roles: [] },
    { slug: 'feldjaeger', name: 'Feldjäger', color: '#3b82f6', icon: 'shield-alert', description: 'Militärpolizei der Bundeswehr.', sub_roles: [] },
    { slug: 'marine', name: 'Marine', color: '#2563EB', icon: 'anchor', description: 'Operationen zu Wasser.', sub_roles: ['BEK', 'MSK', 'MiTa', 'KSM'] },
    { slug: 'sani', name: 'Sanitätsdienst', color: '#ef4444', icon: 'heart-pulse', description: 'Medizinische Versorgung.', sub_roles: [] },
    { slug: 'abc', name: 'ABC Abwehr', color: '#10b981', icon: 'biohazard', description: 'Schutz vor atomaren Bedrohungen.', sub_roles: [] },
    { slug: 'wachbataillon', name: 'Wachbataillon', color: '#eab308', icon: 'flag', description: 'Ehrengarde und Protokoll.', sub_roles: [] },
    { slug: 'un', name: 'United Nations', color: '#38bdf8', icon: 'globe', description: 'Internationale Friedenssicherung.', sub_roles: [] },
];

const BASE_TABS = [
    { id: 'overview', label: 'ÜBERSICHT' },
    { id: 'members', label: 'MITGLIEDER' },
    { id: 'signoffs', label: 'ABMELDUNG' },
    { id: 'strikes', label: 'STRIKES' },
    { id: 'appearance', label: 'ERSCHEINUNGSBILD' },
];

// ─── State ──────────────────────────────────────────────────────────────────
let divisions = [];
let selectedDivision = null;
let selectedMembers = [];
let currentUser = null;       // { username, robloxId }
let isSystemAdmin = false;
let myLeadSlugs = [];
let myMemberSlugs = [];
let activeTab = 'overview';
let appearanceDraftSubRoles = [];
let rosterSearch = '';

// ─── Helpers ────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '226, 176, 7';
}

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function unitCode(index) {
    return `DIV-${String(index + 1).padStart(2, '0')}`;
}

function canManageSelected() {
    if (!currentUser || !selectedDivision) return false;
    return isSystemAdmin || myLeadSlugs.includes(selectedDivision.slug);
}

// canManage(), plus a plain roster member of the selected division.
function canAccessSelected() {
    if (canManageSelected()) return true;
    if (!currentUser || !selectedDivision) return false;
    return myMemberSlugs.includes(selectedDivision.slug);
}

function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applyAccent(color) {
    document.documentElement.style.setProperty('--division-accent', color);
    document.documentElement.style.setProperty('--division-accent-rgb', hexToRgb(color));
}

// Lucide converts <i data-lucide> into an <svg> in place, so changing the icon
// later means re-inserting a fresh <i> rather than mutating the rendered <svg>.
function setRosterIcon(icon) {
    const wrap = document.getElementById('roster-icon-wrap');
    if (!wrap) return;
    wrap.innerHTML = `<i data-lucide="${esc(icon)}" class="w-7 h-7" style="color: var(--division-accent);"></i>`;
    refreshIcons();
}

// One deliberate crossfade between picker and dossier — not per-element hover fades.
function crossfade(hideEl, showEl) {
    hideEl.classList.add('dv-out');
    setTimeout(() => {
        hideEl.classList.add('hidden');
        showEl.classList.remove('hidden');
        showEl.classList.add('dv-out');
        requestAnimationFrame(() => requestAnimationFrame(() => showEl.classList.remove('dv-out')));
    }, 320);
}

function renderLockedPanel(host, message) {
    host.innerHTML = `
        <div class="dv-hud border border-white/10 bg-[#0d0d0d] p-8 max-w-md">
            <p class="dv-label mb-3">Gesperrt</p>
            <p class="text-gray-400 text-sm mb-5 leading-relaxed">${esc(message)}</p>
            ${!currentUser ? `<button onclick="startDivisionLogin()" class="dv-btn w-full">Mit Roblox anmelden</button>` : ''}
        </div>`;
}

// The Roblox OAuth app only has /team registered as a redirect URI, so login is
// always started with that as the target (see the <script> in division.html that
// sets window.BWRP_OAUTH_REDIRECT before auth.js loads), and auth.js's existing
// bwrp_oauth_return mechanism (already used the same way for /dev) forwards the
// user back here once team.html has forwarded the code along (team.html never
// redeems it itself when bwrp_oauth_return points elsewhere).
function startDivisionLogin() {
    localStorage.setItem('bwrp_oauth_return', window.location.pathname);
    startRobloxOAuth();
}

// Own OAuth-callback handling (NOT auth.js's checkOAuthCallback — that calls the
// staff login endpoint). Exchanges ?code=... for a division session.
async function checkDivisionOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const division = params.get('division');
    window.history.replaceState({}, document.title, window.location.pathname + (division ? `?division=${division}` : ''));

    try {
        const { ok, data } = await window.api.divisionLogin(code, window.BWRP_OAUTH_REDIRECT);
        if (!ok || !data.success || !data.user) throw new Error(data?.error || 'Anmeldung fehlgeschlagen');
        await onDivisionLogin(data.user);
        showToast(`Angemeldet als ${data.user.username}`, 'success', 3000);
    } catch (err) {
        showToast(friendlyApiError(err, 'Anmeldung fehlgeschlagen'), 'error');
    }
}

// Own session-restore check (NOT auth.js's checkSession) — reads the
// bwrp_division_access cookie via GET /api/divisions/auth/me.
async function checkDivisionSession() {
    try {
        const res = await window.api.getDivisionMe();
        await onDivisionLogin(res.user);
    } catch { /* not logged in — fine, /division works fine anonymously */ }
}

async function onDivisionLogin(user) {
    currentUser = user;
    await loadMyLeads();
    if (selectedDivision) renderRosterView();
}

async function handleLogout() {
    await window.api.divisionLogout();
    currentUser = null;
    isSystemAdmin = false;
    myLeadSlugs = [];
    myMemberSlugs = [];
    activeTab = 'overview';
    if (selectedDivision) renderRosterView();
}

// ─── Picker ─────────────────────────────────────────────────────────────────
async function loadDivisions() {
    try {
        const res = await window.api.getDivisions();
        divisions = res.divisions;
    } catch {
        divisions = FALLBACK_DIVISIONS;
    }
    renderPicker();

    // Deep link: /division?division=marine
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('division');
    if (wanted && divisions.some(d => d.slug === wanted)) selectDivision(wanted);
}

function renderPicker() {
    const grid = document.getElementById('division-grid');
    if (!grid) return;
    grid.innerHTML = divisions.map((d, i) => `
        <div class="tilt-card group bg-[#111] border border-white/5 relative h-[320px] overflow-hidden reveal active cursor-pointer transition-colors"
            onclick="selectDivision('${d.slug}')">
            <div class="tilt-content relative z-10 p-8 h-full flex flex-col">
                <div class="flex justify-between items-start">
                    <div class="w-14 h-14 flex items-center justify-center" style="background:${esc(d.color)}1a; color:${esc(d.color)};">
                        <i data-lucide="${esc(d.icon)}" class="w-7 h-7"></i>
                    </div>
                    <span class="dv-unit-code">${unitCode(i)}</span>
                </div>
                <div class="mt-auto">
                    <h3 class="font-display text-3xl font-bold text-white mb-2 group-hover:translate-x-2 transition-transform">${esc(d.name)}</h3>
                    <div class="h-1 w-12 mb-4 group-hover:w-full transition-all duration-500" style="background:${esc(d.color)};"></div>
                    <p class="text-gray-400 text-sm mb-6 line-clamp-2">${esc(d.description)}</p>
                    <span class="text-xs font-bold uppercase tracking-wider flex items-center gap-2 group-hover:gap-4 transition-all" style="color:${esc(d.color)};">
                        Auswählen <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    refreshIcons();
    if (typeof initTiltEffect === 'function') initTiltEffect();
}

// ─── Division view (tabs) ───────────────────────────────────────────────────
async function selectDivision(slug) {
    const base = divisions.find(d => d.slug === slug);
    if (!base) return;
    selectedDivision = base;
    activeTab = 'overview';
    rosterSearch = '';
    applyAccent(base.color);

    const url = new URL(window.location.href);
    url.searchParams.set('division', slug);
    window.history.replaceState({}, document.title, url.pathname + url.search);

    const pickerView = document.getElementById('picker-view');
    const rosterView = document.getElementById('roster-view');
    if (!pickerView.classList.contains('hidden')) crossfade(pickerView, rosterView);

    setRosterIcon(base.icon);
    document.getElementById('roster-name').textContent = base.name;
    document.getElementById('roster-tab-content').innerHTML = '<p class="text-gray-500 text-xs font-mono">LADE ...</p>';

    try {
        const res = await window.api.getDivision(slug);
        selectedDivision = res.division;
        selectedMembers = res.members;
    } catch {
        selectedMembers = [];
    }

    renderRosterView();
}

function backToPicker() {
    selectedDivision = null;
    const pickerView = document.getElementById('picker-view');
    const rosterView = document.getElementById('roster-view');
    crossfade(rosterView, pickerView);
    const url = new URL(window.location.href);
    url.searchParams.delete('division');
    window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
}

function renderRosterView() {
    const tabs = isSystemAdmin ? [...BASE_TABS, { id: 'leads', label: 'DIVISIONSLEITUNG' }] : BASE_TABS;
    document.getElementById('roster-tabs').innerHTML =
        tabs.map(t => `<button onclick="setRosterTab('${t.id}')" class="dv-tab ${activeTab === t.id ? 'dv-tab-active' : ''}">${t.label}</button>`).join('')
        + (currentUser ? `<button onclick="handleLogout()" class="dv-tab ml-auto !text-gray-600">ABMELDEN</button>` : '');
    renderRosterTabContent();
}

function setRosterTab(id) {
    activeTab = id;
    renderRosterView();
}

function renderRosterTabContent() {
    const host = document.getElementById('roster-tab-content');
    if (!host) return;
    if (activeTab === 'overview') return renderOverviewTab(host);
    if (activeTab === 'members') return renderMembersTab(host);
    if (activeTab === 'signoffs') return renderSignoffsGate(host);
    if (activeTab === 'strikes') return renderStrikesGate(host);
    if (activeTab === 'appearance') return renderAppearanceGate(host);
    if (activeTab === 'leads') return renderLeadsGate(host);
}

function accessTierLabel() {
    if (isSystemAdmin) return 'SYSTEMADMIN';
    if (myLeadSlugs.includes(selectedDivision.slug)) return 'DIVISIONSLEITUNG';
    if (myMemberSlugs.includes(selectedDivision.slug)) return 'MITGLIED';
    return null;
}

// ─── Übersicht tab ──────────────────────────────────────────────────────────
function renderOverviewTab(host) {
    const subRoles = selectedDivision.sub_roles || [];
    const tier = currentUser ? accessTierLabel() : null;
    host.innerHTML = `
        <p class="text-gray-300 text-sm max-w-xl leading-relaxed mb-6">${esc(selectedDivision.description)}</p>
        <div class="flex flex-wrap gap-x-6 gap-y-1 mb-8">
            <span class="dv-stat">MITGLIEDER <b>${selectedMembers.length}</b></span>
            ${subRoles.length ? `<span class="dv-stat">UNTERROLLEN <b>${subRoles.length}</b></span>` : ''}
            <span class="dv-stat inline-flex items-center gap-1.5">FARBE <span class="inline-block w-2.5 h-2.5" style="background:var(--division-accent);"></span> <b>${esc(selectedDivision.color).toUpperCase()}</b></span>
        </div>
        ${!currentUser ? `
        <div class="dv-hud border border-white/10 bg-[#0d0d0d] p-6 max-w-md">
            <p class="dv-label mb-3">Anmeldung</p>
            <p class="text-gray-400 text-sm mb-4 leading-relaxed">Mit deinem Roblox-Account anmelden, um Abmeldungen einzutragen — Divisionsleitung erhält zusätzlich Zugriff auf Mitglieder, Strikes und Erscheinungsbild.</p>
            <button onclick="startDivisionLogin()" class="dv-btn w-full">Mit Roblox anmelden</button>
        </div>` : `
        <p class="dv-stat">ANGEMELDET ALS <b>${esc(currentUser.username)}</b>${tier ? ` &middot; ${tier}` : ' &middot; KEINE DIVISION ZUGEORDNET'}</p>`}
    `;
}

async function loadMyLeads() {
    try {
        const res = await window.api.getMyDivisionLeads();
        isSystemAdmin = res.isSystemAdmin;
        myLeadSlugs = res.leadOf;
        myMemberSlugs = res.memberOf;
    } catch {
        isSystemAdmin = false;
        myLeadSlugs = [];
        myMemberSlugs = [];
    }
}

// ─── Mitglieder tab (public read, Divisionsleitung/OWNER can edit) ─────────
function renderMembersTab(host) {
    const can = canManageSelected();
    const subRoles = selectedDivision.sub_roles || [];
    host.innerHTML = `
        ${can ? `
        <form id="member-form" class="flex flex-wrap items-end gap-4 mb-3">
            <div class="flex-1 min-w-[10rem]">
                <label class="dv-label">Name</label>
                <input name="username" placeholder="Rufname" required class="dv-field">
            </div>
            <div class="w-48">
                <label class="dv-label">Roblox User-ID (optional)</label>
                <input name="robloxId" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="für Login-Zugriff" class="dv-field">
            </div>
            <div class="w-40">
                <label class="dv-label">Unterrolle</label>
                <select name="subRole" class="dv-field">
                    <option value="">Ohne</option>
                    ${subRoles.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
                </select>
            </div>
            <div class="w-40">
                <label class="dv-label">Eintritt</label>
                <input name="joinedAt" type="date" class="dv-field">
            </div>
            <button class="dv-btn">Hinzufügen</button>
        </form>
        <p class="dv-stat mb-8">MIT ROBLOX USER-ID KANN SICH DAS MITGLIED SELBST ANMELDEN UND ABMELDUNGEN EINTRAGEN.</p>` : ''}
        <div class="max-w-sm mb-6">
            <input id="roster-search" type="search" placeholder="Namen suchen …" value="${esc(rosterSearch)}"
                class="dv-field" aria-label="Mitglieder durchsuchen">
        </div>
        <div id="member-roster"></div>
    `;
    if (can) document.getElementById('member-form').addEventListener('submit', onAddMember);
    document.getElementById('roster-search').addEventListener('input', e => {
        rosterSearch = e.target.value;
        renderMemberRoster();
    });
    renderMemberRoster();
}

function renderMemberRoster() {
    const host = document.getElementById('member-roster');
    if (!host) return;
    const can = canManageSelected();
    const subRoles = selectedDivision.sub_roles || [];
    const groups = subRoles.length ? [...subRoles, ''] : [''];
    const term = rosterSearch.trim().toLowerCase();
    const visible = term ? selectedMembers.filter(m => m.username.toLowerCase().includes(term)) : selectedMembers;

    if (term && !visible.length) {
        host.innerHTML = `<p class="text-gray-500 text-sm">Kein Mitglied mit diesem Namen gefunden.</p>`;
        return;
    }

    const readonlyCard = m => `
        <div class="dv-row px-4 py-3">
            <p class="text-white text-sm font-medium">${esc(m.username)}</p>
            ${m.joined_at ? `<p class="dv-stat mt-0.5">EINTRITT ${esc(m.joined_at)}</p>` : ''}
        </div>`;

    const editableRow = m => `
        <div class="dv-row px-4 py-3 flex flex-wrap items-center gap-3">
            <input value="${esc(m.username)}" onblur="onEditMember(${m.id}, {username: this.value})"
                class="dv-field flex-1 min-w-[8rem] !border-b !border-transparent hover:!border-white/15 focus:!border-white/30">
            <input value="${esc(m.roblox_id || '')}" placeholder="Roblox-ID" onblur="onEditMember(${m.id}, {robloxId: this.value})"
                class="dv-field w-32 !border-b !border-transparent hover:!border-white/15 focus:!border-white/30">
            ${subRoles.length ? `
            <select onchange="onEditMember(${m.id}, {subRole: this.value})" class="dv-field w-32">
                <option value="" ${!m.sub_role ? 'selected' : ''}>Ohne</option>
                ${subRoles.map(r => `<option value="${esc(r)}" ${m.sub_role === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
            </select>` : ''}
            <input type="date" value="${esc(m.joined_at || '')}" onchange="onEditMember(${m.id}, {joinedAt: this.value})" class="dv-field w-36">
            <button onclick="onRemoveMember(${m.id})" class="text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">Löschen</button>
        </div>`;

    host.innerHTML = groups.map(group => {
        const members = visible.filter(m => (m.sub_role || '') === group);
        if (!members.length && group === '' && subRoles.length) return '';
        return `
            <div class="dv-group-rail ${group ? 'dv-active' : ''} mb-8">
                <h2 class="font-display text-lg text-white mb-3">
                    ${group ? esc(group) : (subRoles.length ? 'Ohne Unterrolle' : 'Mitglieder')}
                </h2>
                ${members.length
                ? (can
                    ? `<div class="space-y-2">${members.map(editableRow).join('')}</div>`
                    : `<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${members.map(readonlyCard).join('')}</div>`)
                : '<p class="text-gray-500 text-sm">Noch keine Einträge.</p>'}
            </div>`;
    }).join('');
}

async function onAddMember(e) {
    e.preventDefault();
    const form = e.target;
    const robloxId = form.robloxId.value.trim();
    if (robloxId && !/^\d+$/.test(robloxId)) { showToast('Ungültige Roblox User-ID', 'error'); return; }
    const data = {
        username: form.username.value.trim(),
        robloxId: robloxId || null,
        subRole: form.subRole.value,
        joinedAt: form.joinedAt.value || null,
    };
    if (!data.username) return;
    try {
        await window.api.addDivisionMember(selectedDivision.slug, data);
        showToast('Mitglied hinzugefügt', 'success', 3000);
        form.reset();
        await refreshSelectedDivision();
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Mitglied nicht hinzufügen'), 'error');
    }
}

async function onEditMember(id, patch) {
    const m = selectedMembers.find(x => x.id === id);
    if (!m) return;
    const next = {
        username: patch.username !== undefined ? patch.username.trim() : m.username,
        robloxId: patch.robloxId !== undefined ? patch.robloxId.trim() : m.roblox_id,
        subRole: patch.subRole !== undefined ? patch.subRole : m.sub_role,
        joinedAt: patch.joinedAt !== undefined ? (patch.joinedAt || null) : m.joined_at,
    };
    if (next.robloxId && !/^\d+$/.test(next.robloxId)) { showToast('Ungültige Roblox User-ID', 'error'); renderMemberRoster(); return; }
    if (!next.username || (next.username === m.username && next.robloxId === m.roblox_id && next.subRole === m.sub_role && next.joinedAt === m.joined_at)) return;
    try {
        await window.api.updateDivisionMember(selectedDivision.slug, id, next);
        Object.assign(m, { username: next.username, roblox_id: next.robloxId || null, sub_role: next.subRole, joined_at: next.joinedAt });
        renderMemberRoster();
        showToast('Gespeichert', 'success', 1800);
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Änderung nicht speichern'), 'error');
        renderMemberRoster();
    }
}

async function onRemoveMember(id) {
    try {
        await window.api.removeDivisionMember(selectedDivision.slug, id);
        await refreshSelectedDivision();
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Mitglied nicht löschen'), 'error');
    }
}

async function refreshSelectedDivision() {
    const slug = selectedDivision.slug;
    const res = await window.api.getDivision(slug);
    selectedDivision = res.division;
    selectedMembers = res.members;
    renderMemberRoster();
}

// ─── Abmeldung tab (system admin, Divisionsleitung, or a member of this division) ──
function renderSignoffsGate(host) {
    if (!canAccessSelected()) {
        renderLockedPanel(host, currentUser
            ? 'Du bist kein Mitglied dieser Division.'
            : 'Mit deinem Roblox-Account anmelden, um Abmeldungen dieser Division zu sehen und einzutragen.');
        return;
    }
    renderSignoffsTab(host);
}

async function renderSignoffsTab(host) {
    host.innerHTML = '<p class="text-gray-500 text-xs font-mono">LADE ABMELDUNGEN ...</p>';
    let signoffs = [];
    try {
        const res = await window.api.getDivisionSignoffs(selectedDivision.slug);
        signoffs = res.signoffs;
    } catch (err) {
        host.innerHTML = `<p class="text-red-400 text-sm">${esc(friendlyApiError(err, 'Abmeldungen konnten nicht geladen werden'))}</p>`;
        return;
    }

    host.innerHTML = `
        <form id="signoff-form" class="flex flex-wrap items-end gap-4 mb-8">
            <div class="w-40">
                <label class="dv-label">Von</label>
                <input name="fromDate" type="date" required class="dv-field">
            </div>
            <div class="w-40">
                <label class="dv-label">Bis (optional)</label>
                <input name="toDate" type="date" class="dv-field">
            </div>
            <div class="flex-1 min-w-[12rem]">
                <label class="dv-label">Grund</label>
                <input name="reason" placeholder="z. B. Urlaub, Klausurenphase …" required class="dv-field">
            </div>
            <button class="dv-btn">Abmelden</button>
        </form>
        <p class="dv-stat mb-6">GILT FÜR ${esc(currentUser.username).toUpperCase()} — WIRD AUTOMATISCH ZUGEORDNET.</p>
        <div id="signoff-list" class="space-y-2"></div>
    `;
    document.getElementById('signoff-form').addEventListener('submit', onAddSignoff);
    renderSignoffList(signoffs);
}

function renderSignoffList(signoffs) {
    const list = document.getElementById('signoff-list');
    if (!signoffs.length) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Keine aktuellen Abmeldungen.</p>';
        return;
    }
    const canModerate = canManageSelected();
    list.innerHTML = signoffs.map(s => {
        const isOwner = currentUser && s.roblox_id === currentUser.robloxId;
        return `
        <div class="dv-row px-4 py-3 flex items-center justify-between gap-3">
            <div>
                <p class="text-white text-sm">${esc(s.username)}</p>
                <p class="dv-stat mt-0.5">${esc(s.from_date)}${s.to_date ? ` &ndash; ${esc(s.to_date)}` : ' &middot; UNBEFRISTET'} &middot; ${esc(s.reason)}</p>
            </div>
            ${(isOwner || canModerate) ? `<button onclick="onRemoveSignoff(${s.id})" class="text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">Löschen</button>` : ''}
        </div>`;
    }).join('');
}

async function onAddSignoff(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        fromDate: form.fromDate.value,
        toDate: form.toDate.value || null,
        reason: form.reason.value.trim(),
    };
    if (!data.fromDate || !data.reason) return;
    try {
        await window.api.addDivisionSignoff(selectedDivision.slug, data);
        showToast('Abmeldung eingetragen', 'success', 3000);
        renderSignoffsTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Abmeldung nicht eintragen'), 'error');
    }
}

async function onRemoveSignoff(id) {
    try {
        await window.api.removeDivisionSignoff(selectedDivision.slug, id);
        renderSignoffsTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Abmeldung nicht löschen'), 'error');
    }
}

// ─── Strikes tab (locked unless Divisionsleitung/OWNER) ────────────────────
function renderStrikesGate(host) {
    if (!canManageSelected()) {
        renderLockedPanel(host, currentUser
            ? 'Nur die Divisionsleitung dieser Division kann Strikes einsehen und verwalten.'
            : 'Mit deinem Roblox-Account anmelden, um Strikes einzusehen und zu verwalten.');
        return;
    }
    renderStrikesTab(host);
}

async function renderStrikesTab(host) {
    host.innerHTML = '<p class="text-gray-500 text-xs font-mono">LADE STRIKES ...</p>';
    let strikes = [];
    try {
        const res = await window.api.getDivisionStrikes(selectedDivision.slug);
        strikes = res.strikes;
    } catch (err) {
        host.innerHTML = `<p class="text-red-400 text-sm">${esc(friendlyApiError(err, 'Strikes konnten nicht geladen werden'))}</p>`;
        return;
    }

    const flagged = strikes.filter(s => s.count >= 3);

    host.innerHTML = `
        ${flagged.length ? `
        <div class="dv-row dv-row-flagged px-4 py-3 mb-6 flex items-center gap-3">
            <i data-lucide="triangle-alert" class="w-4 h-4 text-red-400 shrink-0"></i>
            <p class="text-red-300 text-sm">
                ${flagged.map(s => esc(s.member_name)).join(', ')}
                ${flagged.length === 1 ? 'hat' : 'haben'} 3 Strikes — ein Teamlock ist erforderlich.
            </p>
        </div>` : ''}
        <form id="strike-form" class="flex flex-wrap items-end gap-4 mb-8">
            <div class="flex-1 min-w-[10rem]">
                <label class="dv-label">Name</label>
                <input name="memberName" placeholder="Rufname" required class="dv-field">
            </div>
            <div class="w-40">
                <label class="dv-label">Art</label>
                <select name="kind" class="dv-field">
                    <option value="temp">Zeitspanne</option>
                    <option value="perm">Permanent</option>
                </select>
            </div>
            <div class="w-28">
                <label class="dv-label">Strikes</label>
                <select name="count" class="dv-field">
                    ${[0, 1, 2, 3].map(n => `<option value="${n}" ${n === 1 ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
            </div>
            <div class="w-52">
                <label class="dv-label">Gültig bis</label>
                <input name="expiresAt" type="datetime-local" class="dv-field">
            </div>
            <button class="dv-btn">Hinzufügen</button>
        </form>
        <div id="strike-list" class="space-y-2"></div>
    `;
    document.getElementById('strike-form').addEventListener('submit', onAddStrike);
    renderStrikeList(strikes);
    refreshIcons();
}

function renderStrikeList(strikes) {
    const list = document.getElementById('strike-list');
    if (!strikes.length) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Noch keine Strikes.</p>';
        return;
    }
    list.innerHTML = strikes.map(s => `
        <div class="dv-row px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${s.count >= 3 ? 'dv-row-flagged' : ''}">
            <div>
                <p class="text-white text-sm">${esc(s.member_name)}</p>
                <p class="dv-stat mt-0.5">${s.kind === 'temp' ? 'ZEITSPANNE' : 'PERMANENT'}${s.expires_at ? ` &middot; LÄUFT AB ${esc(s.expires_at)}` : ''}</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex gap-1">${[0, 1, 2].map(i => `<span class="dv-pip ${i < s.count ? 'dv-pip-on' : ''}"></span>`).join('')}</div>
                <select onchange="onUpdateStrike(${s.id}, {count: Number(this.value)})" class="dv-field w-16 !py-1.5">
                    ${[0, 1, 2, 3].map(n => `<option value="${n}" ${n === s.count ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
                <button onclick="onRemoveStrike(${s.id})" class="text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">Löschen</button>
            </div>
        </div>
    `).join('');
}

async function onAddStrike(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        memberName: form.memberName.value.trim(),
        kind: form.kind.value,
        count: Number(form.count.value),
        expiresAt: form.kind.value === 'temp' && form.expiresAt.value ? form.expiresAt.value : null,
    };
    if (!data.memberName) return;
    try {
        await window.api.addDivisionStrike(selectedDivision.slug, data);
        showToast('Strike hinzugefügt', 'success', 3000);
        renderStrikesTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Strike nicht hinzufügen'), 'error');
    }
}

async function onUpdateStrike(id, patch) {
    try {
        await window.api.updateDivisionStrike(selectedDivision.slug, id, patch);
        renderStrikesTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Strike nicht aktualisieren'), 'error');
    }
}

async function onRemoveStrike(id) {
    try {
        await window.api.removeDivisionStrike(selectedDivision.slug, id);
        renderStrikesTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Strike nicht löschen'), 'error');
    }
}

// ─── Erscheinungsbild tab (locked; icon is fixed and not editable here) ────
function renderAppearanceGate(host) {
    if (!canManageSelected()) {
        renderLockedPanel(host, currentUser
            ? 'Nur die Divisionsleitung dieser Division kann das Erscheinungsbild bearbeiten.'
            : 'Mit deinem Roblox-Account anmelden, um Teamfarbe, Beschreibung und Unterrollen zu bearbeiten.');
        return;
    }
    renderAppearanceTab(host);
}

function renderAppearanceTab(host) {
    const d = selectedDivision;
    appearanceDraftSubRoles = [...(d.sub_roles || [])];
    host.innerHTML = `
        <form id="appearance-form" class="max-w-xl space-y-7">
            <div class="flex items-center gap-5">
                <div>
                    <label class="dv-label">Teamfarbe</label>
                    <input name="color" type="color" value="${esc(d.color)}" class="h-10 w-20 bg-transparent border border-white/10 cursor-pointer">
                </div>
                <div>
                    <label class="dv-label">Icon</label>
                    <div class="dv-icon-swatch dv-icon-active" title="Icon ist an divisions.html gebunden und kann nicht geändert werden">
                        <i data-lucide="${esc(d.icon)}" class="w-4 h-4"></i>
                    </div>
                </div>
            </div>
            <div>
                <label class="dv-label">Beschreibung</label>
                <textarea name="description" rows="2" class="dv-field resize-y">${esc(d.description)}</textarea>
            </div>
            <div>
                <label class="dv-label">Unterrollen</label>
                <div id="subrole-chips" class="flex flex-wrap gap-2 mb-3"></div>
                <div class="flex gap-2">
                    <input id="subrole-input" placeholder="z. B. BEK" class="dv-field flex-1">
                    <button type="button" onclick="onAddSubRoleChip()" class="dv-btn dv-btn-ghost">Hinzufügen</button>
                </div>
            </div>
            <button class="dv-btn">Speichern</button>
        </form>
    `;
    renderSubRoleChips();
    document.getElementById('subrole-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); onAddSubRoleChip(); }
    });
    document.getElementById('appearance-form').addEventListener('submit', onSaveAppearance);
    refreshIcons();
}

function renderSubRoleChips() {
    const host = document.getElementById('subrole-chips');
    host.innerHTML = appearanceDraftSubRoles.length
        ? appearanceDraftSubRoles.map((r, i) => `<span class="dv-chip">${esc(r)} <button type="button" onclick="onRemoveSubRoleChip(${i})">✕</button></span>`).join('')
        : '<p class="text-gray-600 text-xs">Keine Unterrollen definiert.</p>';
}

function onAddSubRoleChip() {
    const input = document.getElementById('subrole-input');
    const val = input.value.trim();
    if (!val || appearanceDraftSubRoles.includes(val) || appearanceDraftSubRoles.length >= 12) { input.value = ''; return; }
    appearanceDraftSubRoles.push(val);
    input.value = '';
    renderSubRoleChips();
}

function onRemoveSubRoleChip(index) {
    appearanceDraftSubRoles.splice(index, 1);
    renderSubRoleChips();
}

async function onSaveAppearance(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        color: form.color.value,
        description: form.description.value.trim(),
        sub_roles: appearanceDraftSubRoles,
    };
    try {
        await window.api.updateDivision(selectedDivision.slug, data);
        showToast('Erscheinungsbild gespeichert', 'success', 3000);
        const res = await window.api.getDivision(selectedDivision.slug);
        selectedDivision = res.division;
        selectedMembers = res.members;
        const idx = divisions.findIndex(x => x.slug === selectedDivision.slug);
        if (idx >= 0) divisions[idx] = selectedDivision;
        renderPicker();
        applyAccent(selectedDivision.color);
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Erscheinungsbild nicht speichern'), 'error');
    }
}

// ─── Divisionsleitung tab (system admin only) ──────────────────────────────
function renderLeadsGate(host) {
    if (!isSystemAdmin) {
        renderLockedPanel(host, 'Nur der Systemadministrator kann Divisionsleitungen verwalten.');
        return;
    }
    renderLeadsTab(host);
}

async function renderLeadsTab(host) {
    host.innerHTML = '<p class="text-gray-500 text-xs font-mono">LADE DIVISIONSLEITUNG ...</p>';
    let leads = [];
    try {
        const res = await window.api.getDivisionLeads(selectedDivision.slug);
        leads = res.leads;
    } catch (err) {
        host.innerHTML = `<p class="text-red-400 text-sm">${esc(friendlyApiError(err, 'Divisionsleitung konnte nicht geladen werden'))}</p>`;
        return;
    }

    host.innerHTML = `
        <div id="leads-list" class="space-y-2 mb-8"></div>
        <form id="lead-form" class="flex flex-wrap items-end gap-4">
            <div>
                <label class="dv-label">Roblox-Nutzername oder User-ID</label>
                <input name="identifier" type="text" placeholder="z. B. thatzanex oder 1185800266" required class="dv-field w-64">
            </div>
            <button class="dv-btn">Als Divisionsleitung zuweisen</button>
        </form>
        <p class="dv-stat mt-3">MUSS KEIN TEAMMITGLIED SEIN — WIRD NICHT IM TEAM-PANEL ANGEZEIGT.</p>
    `;
    renderLeadsList(leads);
    document.getElementById('lead-form').addEventListener('submit', onAssignLead);
}

function renderLeadsList(leads) {
    const list = document.getElementById('leads-list');
    if (!leads.length) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Noch keine Divisionsleitung zugewiesen.</p>';
        return;
    }
    list.innerHTML = leads.map(l => `
        <div class="dv-row px-4 py-3 flex items-center justify-between gap-3">
            <div>
                <p class="text-white text-sm">${l.username ? esc(l.username) : `Roblox-ID ${esc(l.roblox_id)}`}</p>
                <p class="dv-stat mt-0.5">${l.username ? `ROBLOX-ID ${esc(l.roblox_id)} &middot; ` : ''}SEIT ${esc(l.assigned_at)}</p>
            </div>
            <button onclick="onRemoveLead('${esc(l.roblox_id)}')" class="text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">Entfernen</button>
        </div>
    `).join('');
}

async function onAssignLead(e) {
    e.preventDefault();
    const form = e.target;
    const identifier = form.identifier.value.trim();
    if (!identifier) return;
    try {
        const res = await window.api.assignDivisionLead(selectedDivision.slug, encodeURIComponent(identifier));
        showToast(res.username ? `${res.username} als Divisionsleitung zugewiesen` : 'Divisionsleitung zugewiesen', 'success', 3000);
        renderLeadsTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Divisionsleitung nicht zuweisen'), 'error');
    }
}

async function onRemoveLead(robloxId) {
    try {
        await window.api.removeDivisionLead(selectedDivision.slug, robloxId);
        renderLeadsTab(document.getElementById('roster-tab-content'));
    } catch (err) {
        showToast(friendlyApiError(err, 'Konnte Divisionsleitung nicht entfernen'), 'error');
    }
}

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-back')?.addEventListener('click', backToPicker);
    await loadDivisions();
    await checkDivisionOAuthCallback();
    await checkDivisionSession();
});

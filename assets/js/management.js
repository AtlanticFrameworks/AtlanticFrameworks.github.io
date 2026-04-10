// assets/js/management.js

let _availableRoles = null;

async function getAvailableRoles() {
    if (_availableRoles) return _availableRoles;
    try {
        const data = await window.api.getRoles();
        _availableRoles = data.roles ?? [];
    } catch { _availableRoles = []; }
    return _availableRoles;
}

// ── Load & Render ──────────────────────────────────────────────────────────────

async function loadStaffManagement() {
    const tbody = document.getElementById('mgmt-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-tac-muted py-10">
        <div class="animate-spin w-5 h-5 border-2 border-tac-border border-t-purple-400 rounded-full mx-auto mb-2"></div>
        Lade Daten...
    </td></tr>`;

    _availableRoles = null;

    try {
        const [staffData] = await Promise.all([
            window.api.getStaffManagement(),
            getAvailableRoles(),
        ]);
        renderStaffManagement(staffData.staff);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-tac-red py-10 font-mono text-xs">
            Fehler: ${e.message}
        </td></tr>`;
    }
}

function renderStaffManagement(staffList) {
    const tbody = document.getElementById('mgmt-table-body');
    if (!staffList || staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-tac-muted py-10">Keine Mitarbeiter gefunden.</td></tr>';
        return;
    }

    const rows = staffList.map(s => {
        const lastSeen = s.last_seen ? new Date(s.last_seen).toLocaleDateString('de-DE') : 'Unbekannt';

        const hwidStatus = s.hwidLocked
            ? '<span class="text-tac-amber flex items-center justify-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Gesperrt</span>'
            : '<span class="text-tac-green flex items-center justify-center gap-1"><i data-lucide="unlock" class="w-3 h-3"></i> Offen</span>';

        // Role badges + assign button inline
        const roleBadges = (s.customRoles ?? []).map(r =>
            `<span class="px-1.5 py-0.5 text-[9px] font-bold tracking-widest border cursor-default"
                style="color:${r.color};border-color:${r.color}40"
                id="badge-${s.id}-${r.role_id}">${r.name.toUpperCase()}</span>`
        ).join('');

        const rolesCell = `
            <div class="flex items-center flex-wrap gap-1" id="custom-roles-${s.id}">
                ${roleBadges || '<span class="text-tac-muted text-[9px] font-mono italic">Kein Rang</span>'}
                <button onclick="openRoleAssign(${s.id}, '${s.username}', ${JSON.stringify(s.customRoles ?? []).replace(/"/g, '&quot;')})"
                    class="w-5 h-5 flex items-center justify-center border border-dashed border-tac-border text-tac-muted hover:border-purple-500/50 hover:text-purple-400 transition-colors flex-shrink-0"
                    title="Rollen zuweisen">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                </button>
            </div>`;

        return `
        <tr class="border-b border-tac-border/50 hover:bg-white/[0.02] transition-colors group" data-uid="${s.id}">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <img src="${s.avatarUrl || '/assets/images/logo.png'}"
                        class="w-8 h-8 rounded-sm grayscale group-hover:grayscale-0 transition-all border border-tac-border"
                        onerror="this.src='/assets/images/logo.png'">
                    <div>
                        <div class="font-bold text-zinc-200 uppercase tracking-widest">${s.username}</div>
                        <div class="text-[9px] text-tac-muted">ID: ${s.roblox_id}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">${rolesCell}</td>
            <td class="px-4 py-3 text-zinc-400 text-xs">${lastSeen}</td>
            <td class="px-4 py-3 text-center">${hwidStatus}</td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="openActivityModal(${s.id}, '${s.username}')"
                        class="px-2 py-1 border border-tac-border text-tac-muted hover:text-tac-blue hover:border-tac-blue/50 transition-colors"
                        title="Aktivität anzeigen">
                        <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="resetHwidPrompt(${s.id}, '${s.username}')"
                        class="px-2 py-1 border border-tac-border text-tac-muted hover:text-tac-amber hover:border-tac-amber/50 transition-colors"
                        title="HWID-Sperre aufheben">
                        <i data-lucide="monitor-off" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = rows;
    lucide.createIcons({ nodes: [tbody] });
}

// ── HWID Reset ─────────────────────────────────────────────────────────────────

function resetHwidPrompt(id, username) {
    if (!confirm(`HWID-Sperre für ${username} aufheben?`)) return;
    window.api.resetStaffHwid(id)
        .then(() => { showStatus?.(`HWID für ${username} zurückgesetzt.`, 'success'); loadStaffManagement(); })
        .catch(e => showStatus?.(`Fehler: ${e.message}`, 'error'));
}

// ── Role Assignment Modal ──────────────────────────────────────────────────────

async function openRoleAssign(userId, username, currentRoles) {
    const modal = document.getElementById('role-assign-modal');
    if (!modal) return;

    document.getElementById('ram-username').textContent = username;
    document.getElementById('ram-user-id').textContent  = userId;

    const listEl = document.getElementById('ram-role-list');
    listEl.innerHTML = '<div class="text-tac-muted text-xs font-mono text-center py-6">Lade Rollen...</div>';
    modal.classList.remove('hidden');

    try {
        const allRoles = await getAvailableRoles();
        if (!allRoles.length) {
            listEl.innerHTML = '<div class="text-tac-muted text-xs font-mono py-6 text-center">Keine Rollen vorhanden.<br>Erstelle zuerst Rollen im DB Panel → ROLLEN.</div>';
            return;
        }

        const assignedIds = new Set((currentRoles ?? []).map(r => r.role_id ?? r.id));

        listEl.innerHTML = allRoles.map(role => {
            const assigned = assignedIds.has(role.id);
            return `
            <div class="flex items-center justify-between px-4 py-3 border-b border-tac-border/30 last:border-0 hover:bg-white/[0.02]">
                <div class="flex items-center gap-3">
                    <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${role.color}"></div>
                    <div>
                        <div class="font-mono text-xs font-bold text-zinc-200">${role.name}</div>
                        <div class="font-mono text-[9px] text-tac-muted">Hierarchie: ${role.hierarchy}</div>
                    </div>
                </div>
                <button onclick="toggleUserRole(${userId}, ${role.id}, ${assigned}, '${username}', '${role.name}')"
                    id="role-btn-${userId}-${role.id}"
                    class="px-3 py-1 font-mono text-[9px] font-bold tracking-widest transition-all border ${
                        assigned
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-tac-red/10 hover:text-tac-red hover:border-tac-red/50'
                        : 'bg-tac-panel border-tac-border text-tac-muted hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50'
                    }">
                    ${assigned ? 'ZUGEWIESEN' : 'ZUWEISEN'}
                </button>
            </div>`;
        }).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="text-tac-red text-xs font-mono py-6 text-center">Fehler: ${e.message}</div>`;
    }
    lucide.createIcons({ nodes: [modal] });
}

async function toggleUserRole(userId, roleId, isAssigned, username, roleName) {
    const btn = document.getElementById(`role-btn-${userId}-${roleId}`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    try {
        if (isAssigned) {
            await window.api.removeRoleFromUser(userId, roleId);
            showStatus?.(`Rolle "${roleName}" von ${username} entfernt.`, 'success');
        } else {
            await window.api.assignRoleToUser(userId, roleId);
            showStatus?.(`Rolle "${roleName}" ${username} zugewiesen.`, 'success');
        }
        const userData = await window.api.getUserRoles(userId);
        const nowAssigned = (userData.roles ?? []).some(r => r.id === roleId);
        if (btn) {
            btn.disabled = false;
            btn.textContent = nowAssigned ? 'ZUGEWIESEN' : 'ZUWEISEN';
            btn.className = `px-3 py-1 font-mono text-[9px] font-bold tracking-widest transition-all border ${
                nowAssigned
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-tac-red/10 hover:text-tac-red hover:border-tac-red/50'
                : 'bg-tac-panel border-tac-border text-tac-muted hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50'
            }`;
            btn.setAttribute('onclick', `toggleUserRole(${userId}, ${roleId}, ${nowAssigned}, '${username}', '${roleName}')`);
        }
        refreshUserRoleBadges(userId, userData.roles ?? []);
    } catch (e) {
        showStatus?.(`Fehler: ${e.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = isAssigned ? 'ZUGEWIESEN' : 'ZUWEISEN'; }
    }
}

function refreshUserRoleBadges(userId, roles) {
    const el = document.getElementById(`custom-roles-${userId}`);
    if (!el) return;
    const badges = roles.map(r =>
        `<span class="px-1.5 py-0.5 text-[9px] font-bold tracking-widest border cursor-default"
            style="color:${r.color};border-color:${r.color}40">${r.name.toUpperCase()}</span>`
    ).join('');
    el.innerHTML = `
        ${badges || '<span class="text-tac-muted text-[9px] font-mono italic">Kein Rang</span>'}
        <button onclick="openRoleAssign(${userId}, '', ${JSON.stringify(roles).replace(/"/g, '&quot;')})"
            class="w-5 h-5 flex items-center justify-center border border-dashed border-tac-border text-tac-muted hover:border-purple-500/50 hover:text-purple-400 transition-colors flex-shrink-0"
            title="Rollen zuweisen">
            <i data-lucide="plus" class="w-3 h-3"></i>
        </button>`;
    lucide.createIcons({ nodes: [el] });
}

function closeRoleAssignModal() {
    document.getElementById('role-assign-modal')?.classList.add('hidden');
}

// ── Activity Modal ─────────────────────────────────────────────────────────────

async function openActivityModal(userId, username) {
    const modal = document.getElementById('activity-modal');
    if (!modal) return;

    document.getElementById('am-username').textContent = username;
    document.getElementById('am-body').innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin w-6 h-6 border-2 border-tac-border border-t-tac-blue rounded-full"></div>
        </div>`;
    modal.classList.remove('hidden');

    try {
        const d = await window.api.getUserActivity(userId);

        const fmtSec = s => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return `${h}h ${m}m`; };

        const rolesHtml = d.customRoles.length
            ? d.customRoles.map(r =>
                `<span class="px-2 py-0.5 text-[9px] font-bold border" style="color:${r.color};border-color:${r.color}40">${r.name.toUpperCase()}</span>`
              ).join(' ')
            : '<span class="text-tac-muted text-[9px] italic">Kein Rang</span>';

        const iconFor = a => {
            if (a.includes('BAN'))   return 'ban';
            if (a.includes('KICK'))  return 'log-out';
            if (a.includes('CASE'))  return 'folder';
            if (a.includes('SHIFT')) return 'clock';
            if (a.includes('LOGIN')) return 'log-in';
            if (a.includes('ROLE'))  return 'shield';
            return 'activity';
        };

        const activityHtml = d.recentActivity.length
            ? d.recentActivity.map(l => `
                <div class="flex items-start gap-3 py-2 border-b border-tac-border/30 last:border-0">
                    <i data-lucide="${iconFor(l.action)}" class="w-3.5 h-3.5 text-tac-muted mt-0.5 flex-shrink-0"></i>
                    <div class="flex-1 min-w-0">
                        <span class="font-mono text-[10px] text-tac-amber">${l.action}</span>
                        ${l.resourceId ? `<span class="font-mono text-[9px] text-tac-muted ml-2">${l.resource} #${l.resourceId}</span>` : ''}
                    </div>
                    <span class="font-mono text-[9px] text-tac-muted flex-shrink-0">${new Date(l.createdAt).toLocaleDateString('de-DE')}</span>
                </div>`).join('')
            : '<div class="text-tac-muted text-xs font-mono text-center py-4">Keine Aktivitäten</div>';

        document.getElementById('am-body').innerHTML = `
            <div class="space-y-5">
                <div>
                    <p class="font-mono text-[10px] text-tac-muted mb-2 tracking-widest">ROLLEN</p>
                    <div class="flex flex-wrap gap-1">${rolesHtml}</div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-blue">${d.shiftStats.totalShifts}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">SCHICHTEN</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-green">${fmtSec(d.shiftStats.totalSeconds)}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">AKTIV-ZEIT</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-amber">${d.caseStats.total}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">FÄLLE</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-red">${d.caseStats.bans}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">BANS</div>
                    </div>
                </div>
                <div>
                    <p class="font-mono text-[10px] text-tac-muted mb-2 tracking-widest">LETZTE AKTIVITÄTEN</p>
                    <div class="bg-tac-panel border border-tac-border p-3 max-h-52 overflow-y-auto">${activityHtml}</div>
                </div>
            </div>`;

        lucide.createIcons({ nodes: [modal] });
    } catch (e) {
        document.getElementById('am-body').innerHTML =
            `<div class="text-tac-red font-mono text-xs text-center py-8">Fehler: ${e.message}</div>`;
    }
}

function closeActivityModal() {
    document.getElementById('activity-modal')?.classList.add('hidden');
}

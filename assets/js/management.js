// assets/js/management.js

// ── Cache for available roles ──────────────────────────────────────────────────
let _availableRoles = null;

async function getAvailableRoles() {
    if (_availableRoles) return _availableRoles;
    try {
        const data = await window.api.getRoles();
        _availableRoles = data.roles ?? [];
    } catch {
        _availableRoles = [];
    }
    return _availableRoles;
}

// ── Load & Render Staff Table ──────────────────────────────────────────────────

async function loadStaffManagement() {
    const tbody = document.getElementById('mgmt-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-tac-muted py-10"><div class="animate-spin w-5 h-5 border-2 border-tac-border border-t-purple-400 rounded-full mx-auto mb-2"></div> Lade Daten...</td></tr>';

    // Invalidate role cache so fresh roles are fetched
    _availableRoles = null;

    try {
        const [staffData, rolesData] = await Promise.all([
            window.api.getStaffManagement(),
            getAvailableRoles(),
        ]);
        renderStaffManagement(staffData.staff);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-tac-red py-10 font-mono text-xs">Fehler beim Laden: ${e.message}</td></tr>`;
    }
}

function renderStaffManagement(staffList) {
    const tbody = document.getElementById('mgmt-table-body');
    if (!staffList || staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-tac-muted py-10">Keine Mitarbeiter gefunden.</td></tr>';
        return;
    }

    const roleColors = { OWNER: 'text-purple-400', ADMIN: 'text-tac-red', MOD: 'text-tac-amber', TRAINEE: 'text-tac-muted' };

    const rows = staffList.map(s => {
        const date     = new Date(s.created_at).toLocaleDateString('de-DE');
        const lastSeen = s.last_seen ? new Date(s.last_seen).toLocaleDateString('de-DE') : 'Unbekannt';
        const roleCol  = roleColors[s.role] || 'text-white';
        const hwidStatus = s.hwidLocked
            ? '<span class="text-tac-amber flex items-center justify-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Gesperrt</span>'
            : '<span class="text-tac-green flex items-center justify-center gap-1"><i data-lucide="unlock" class="w-3 h-3"></i> Offen</span>';

        // Custom role badges
        const customRoleBadges = (s.customRoles ?? []).map(r =>
            `<span class="px-1.5 py-0.5 text-[9px] font-bold tracking-widest border" style="color:${r.color};border-color:${r.color}40">${r.name.toUpperCase()}</span>`
        ).join(' ');

        // Role assignment dropdown (lazy-populated via openRoleAssign)
        const roleCell = `
            <div class="flex flex-col gap-1">
                <span class="${roleCol} font-bold tracking-widest uppercase text-xs">${s.role}</span>
                <div class="flex flex-wrap gap-1" id="custom-roles-${s.id}">${customRoleBadges || ''}</div>
            </div>`;

        return `
        <tr class="border-b border-tac-border/50 hover:bg-white/[0.02] transition-colors group" data-uid="${s.id}">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <img src="${s.avatarUrl || '/assets/images/logo.png'}" class="w-8 h-8 rounded-sm grayscale group-hover:grayscale-0 transition-all border border-tac-border" onerror="this.src='/assets/images/logo.png'">
                    <div>
                        <div class="font-bold text-zinc-200 uppercase tracking-widest">${s.username}</div>
                        <div class="text-[9px] text-tac-muted">ID: ${s.roblox_id}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">${roleCell}</td>
            <td class="px-4 py-3 text-zinc-400 text-xs">${lastSeen}</td>
            <td class="px-4 py-3 text-center">${hwidStatus}</td>
            <td class="px-4 py-3">
                <button onclick="openRoleAssign(${s.id}, '${s.username}', ${JSON.stringify(s.customRoles ?? []).replace(/"/g, '&quot;')})"
                    class="w-full bg-tac-panel border border-tac-border text-tac-muted hover:text-purple-400 hover:border-purple-500/50 transition-colors font-mono text-[9px] px-2 py-1 flex items-center gap-1 justify-between">
                    <span>ROLLEN</span>
                    <i data-lucide="chevron-down" class="w-3 h-3"></i>
                </button>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="openActivityModal(${s.id}, '${s.username}')"
                        class="px-2 py-1 border border-tac-border text-tac-muted hover:text-tac-blue hover:border-tac-blue/50 transition-colors" title="Aktivität anzeigen">
                        <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="resetHwidPrompt(${s.id}, '${s.username}')"
                        class="px-2 py-1 border border-tac-border text-tac-muted hover:text-tac-amber hover:border-tac-amber/50 transition-colors" title="HWID-Sperre aufheben">
                        <i data-lucide="monitor-off" class="w-4 h-4"></i>
                    </button>
                    <button onclick="updateRolePrompt(${s.id}, '${s.username}', '${s.role}')"
                        class="px-2 py-1 border border-tac-border text-tac-muted hover:text-purple-400 hover:border-purple-400/50 transition-colors" title="System-Rolle ändern">
                        <i data-lucide="shield" class="w-4 h-4"></i>
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
    if (!confirm(`Möchtest du wirklich die Geräte-Sperre (HWID) für ${username} aufheben? Der Nutzer kann sich dann von einem anderen Gerät anmelden.`)) return;

    window.api.resetStaffHwid(id)
        .then(() => {
            showStatus && showStatus(`HWID für ${username} erfolgreich zurückgesetzt.`, 'success');
            loadStaffManagement();
        })
        .catch(e => showStatus && showStatus(`Fehler beim HWID-Reset: ${e.message}`, 'error'));
}

// ── System Role Update ─────────────────────────────────────────────────────────

function updateRolePrompt(id, username, currentRole) {
    const newRole = prompt(`Neue Rolle für ${username} eingeben (OWNER, ADMIN, MOD, TRAINEE):\nAktuell: ${currentRole}`, currentRole);
    if (!newRole) return;

    const roleUpper = newRole.toUpperCase().trim();
    if (!['OWNER', 'ADMIN', 'MOD', 'TRAINEE'].includes(roleUpper)) {
        alert('Ungültige Rolle.');
        return;
    }
    if (!confirm(`${username} auf Rang ${roleUpper} setzen - bist du sicher?`)) return;

    window.api.updateStaffRole(id, roleUpper)
        .then(() => {
            showStatus && showStatus(`Rolle von ${username} erfolgreich aktualisiert.`, 'success');
            loadStaffManagement();
        })
        .catch(e => showStatus && showStatus(`Fehler bei Rollenänderung: ${e.message}`, 'error'));
}

// ── Custom Role Assignment Modal ───────────────────────────────────────────────

async function openRoleAssign(userId, username, currentRoles) {
    const modal = document.getElementById('role-assign-modal');
    if (!modal) return;

    document.getElementById('ram-username').textContent = username;
    document.getElementById('ram-user-id').textContent  = userId;

    const listEl = document.getElementById('ram-role-list');
    listEl.innerHTML = '<div class="text-tac-muted text-xs font-mono">Lade Rollen...</div>';
    modal.classList.remove('hidden');

    try {
        const allRoles = await getAvailableRoles();
        if (!allRoles.length) {
            listEl.innerHTML = '<div class="text-tac-muted text-xs font-mono py-4 text-center">Keine Rollen vorhanden. Erstelle zuerst Rollen im DB Panel.</div>';
            return;
        }

        const assignedIds = new Set((currentRoles ?? []).map(r => r.role_id ?? r.id));

        listEl.innerHTML = allRoles.map(role => {
            const assigned = assignedIds.has(role.id);
            return `
            <div class="flex items-center justify-between px-4 py-3 border border-tac-border/50 hover:border-tac-border transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${role.color}"></div>
                    <div>
                        <div class="font-mono text-xs font-bold text-zinc-200">${role.name}</div>
                        <div class="font-mono text-[9px] text-tac-muted">Hierarchie: ${role.hierarchy}</div>
                    </div>
                </div>
                <button onclick="toggleUserRole(${userId}, ${role.id}, ${assigned}, '${username}', '${role.name}')"
                    id="role-btn-${userId}-${role.id}"
                    class="px-3 py-1 font-mono text-[9px] font-bold tracking-widest transition-colors ${
                        assigned
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-tac-red/10 hover:text-tac-red hover:border-tac-red/50'
                        : 'bg-tac-panel border border-tac-border text-tac-muted hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50'
                    }">
                    ${assigned ? 'ZUGEWIESEN' : 'ZUWEISEN'}
                </button>
            </div>`;
        }).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="text-tac-red text-xs font-mono py-4 text-center">Fehler: ${e.message}</div>`;
    }

    lucide.createIcons({ nodes: [modal] });
}

async function toggleUserRole(userId, roleId, isAssigned, username, roleName) {
    const btn = document.getElementById(`role-btn-${userId}-${roleId}`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    try {
        if (isAssigned) {
            await window.api.removeRoleFromUser(userId, roleId);
            showStatus && showStatus(`Rolle "${roleName}" von ${username} entfernt.`, 'success');
        } else {
            await window.api.assignRoleToUser(userId, roleId);
            showStatus && showStatus(`Rolle "${roleName}" ${username} zugewiesen.`, 'success');
        }
        // Refresh the modal for this user
        const userData = await window.api.getUserRoles(userId);
        if (btn) {
            const nowAssigned = (userData.roles ?? []).some(r => r.id === roleId);
            btn.disabled  = false;
            btn.textContent = nowAssigned ? 'ZUGEWIESEN' : 'ZUWEISEN';
            btn.className = `px-3 py-1 font-mono text-[9px] font-bold tracking-widest transition-colors ${
                nowAssigned
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-tac-red/10 hover:text-tac-red hover:border-tac-red/50'
                : 'bg-tac-panel border border-tac-border text-tac-muted hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50'
            }`;
            btn.setAttribute('onclick', `toggleUserRole(${userId}, ${roleId}, ${nowAssigned}, '${username}', '${roleName}')`);
        }
        // Refresh badge in the table row
        refreshUserRoleBadges(userId, userData.roles ?? []);
    } catch (e) {
        showStatus && showStatus(`Fehler: ${e.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = isAssigned ? 'ZUGEWIESEN' : 'ZUWEISEN'; }
    }
}

function refreshUserRoleBadges(userId, roles) {
    const el = document.getElementById(`custom-roles-${userId}`);
    if (!el) return;
    el.innerHTML = roles.map(r =>
        `<span class="px-1.5 py-0.5 text-[9px] font-bold tracking-widest border" style="color:${r.color};border-color:${r.color}40">${r.name.toUpperCase()}</span>`
    ).join(' ');
}

function closeRoleAssignModal() {
    const modal = document.getElementById('role-assign-modal');
    if (modal) modal.classList.add('hidden');
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

        const fmtSeconds = s => {
            const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
            return `${h}h ${m}m`;
        };

        const customRolesHtml = d.customRoles.length
            ? d.customRoles.map(r => `<span class="px-2 py-0.5 text-[9px] font-bold border" style="color:${r.color};border-color:${r.color}40">${r.name.toUpperCase()}</span>`).join(' ')
            : '<span class="text-tac-muted text-[9px]">Keine</span>';

        const actionIcon = a => {
            if (a.includes('BAN')) return 'ban';
            if (a.includes('KICK')) return 'boot';
            if (a.includes('CASE')) return 'folder';
            if (a.includes('SHIFT')) return 'clock';
            if (a.includes('LOGIN')) return 'log-in';
            if (a.includes('ROLE')) return 'shield';
            return 'activity';
        };

        const recentHtml = d.recentActivity.length
            ? d.recentActivity.map(l => `
                <div class="flex items-start gap-3 py-2 border-b border-tac-border/30 last:border-0">
                    <i data-lucide="${actionIcon(l.action)}" class="w-3.5 h-3.5 text-tac-muted mt-0.5 flex-shrink-0"></i>
                    <div class="flex-1 min-w-0">
                        <span class="font-mono text-[10px] text-tac-amber">${l.action}</span>
                        ${l.resourceId ? `<span class="font-mono text-[9px] text-tac-muted ml-2">${l.resource}#${l.resourceId}</span>` : ''}
                    </div>
                    <span class="font-mono text-[9px] text-tac-muted flex-shrink-0">${new Date(l.createdAt).toLocaleDateString('de-DE')}</span>
                </div>`).join('')
            : '<div class="text-tac-muted text-xs font-mono text-center py-4">Keine Aktivitäten</div>';

        document.getElementById('am-body').innerHTML = `
            <div class="space-y-5">
                <!-- Custom Roles -->
                <div>
                    <p class="font-mono text-[10px] text-tac-muted mb-2 tracking-widest">ZUGEWIESENE ROLLEN</p>
                    <div class="flex flex-wrap gap-1">${customRolesHtml}</div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-blue">${d.shiftStats.totalShifts}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">SCHICHTEN</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-green">${fmtSeconds(d.shiftStats.totalSeconds)}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">AKTIV-ZEIT</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-amber">${d.caseStats.total}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">FÄLLE TOTAL</div>
                    </div>
                    <div class="bg-tac-panel border border-tac-border p-3 text-center">
                        <div class="font-mono text-lg font-bold text-tac-red">${d.caseStats.bans}</div>
                        <div class="font-mono text-[9px] text-tac-muted mt-0.5">BANS</div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div>
                    <p class="font-mono text-[10px] text-tac-muted mb-2 tracking-widest">LETZTE AKTIVITÄTEN</p>
                    <div class="bg-tac-panel border border-tac-border p-3 max-h-52 overflow-y-auto">
                        ${recentHtml}
                    </div>
                </div>
            </div>`;

        lucide.createIcons({ nodes: [modal] });
    } catch (e) {
        document.getElementById('am-body').innerHTML = `<div class="text-tac-red font-mono text-xs text-center py-8">Fehler: ${e.message}</div>`;
    }
}

function closeActivityModal() {
    const modal = document.getElementById('activity-modal');
    if (modal) modal.classList.add('hidden');
}

// assets/js/management.js

async function loadStaffManagement() {
    const tbody = document.getElementById('mgmt-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-tac-muted py-10"><div class="animate-spin w-5 h-5 border-2 border-tac-border border-t-purple-400 rounded-full mx-auto mb-2"></div> Lade Daten...</td></tr>';

    try {
        const data = await window.api.getStaffManagement();
        renderStaffManagement(data.staff);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-tac-red py-10 font-mono text-xs">Fehler beim Laden: ${e.message}</td></tr>`;
    }
}

function renderStaffManagement(staffList) {
    const tbody = document.getElementById('mgmt-table-body');
    if (!staffList || staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-tac-muted py-10">Keine Mitarbeiter gefunden.</td></tr>';
        return;
    }

    const roleColors = { OWNER: 'text-purple-400', ADMIN: 'text-tac-red', MOD: 'text-tac-amber', TRAINEE: 'text-tac-muted' };

    const rows = staffList.map(s => {
        const date = new Date(s.created_at).toLocaleDateString('de-DE');
        const lastSeen = s.last_seen ? new Date(s.last_seen).toLocaleDateString('de-DE') : 'Unbekannt';
        const roleCol = roleColors[s.role] || 'text-white';
        const hwidStatus = s.hwidLocked
            ? '<span class="text-tac-amber flex items-center justify-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Gesperrt</span>'
            : '<span class="text-tac-green flex items-center justify-center gap-1"><i data-lucide="unlock" class="w-3 h-3"></i> Offen</span>';
            
        return `
        <tr class="border-b border-tac-border/50 hover:bg-white/[0.02] transition-colors group">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <img src="${s.avatarUrl || 'data:image/svg+xml;base64,...'}" class="w-8 h-8 rounded-sm grayscale group-hover:grayscale-0 transition-all border border-tac-border" onerror="this.src='/assets/images/logo.png'">
                    <div>
                        <div class="font-bold text-zinc-200 uppercase tracking-widest">${s.username}</div>
                        <div class="text-[9px] text-tac-muted">ID: ${s.roblox_id}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">
                <span class="${roleCol} font-bold tracking-widest uppercase text-xs">${s.role}</span>
            </td>
            <td class="px-4 py-3 text-zinc-400 text-xs">${lastSeen}</td>
            <td class="px-4 py-3 text-center">${hwidStatus}</td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="resetHwidPrompt(${s.id}, '${s.username}')" class="px-2 py-1 border border-tac-border text-tac-muted hover:text-tac-amber hover:border-tac-amber/50 transition-colors" title="HWID-Sperre aufheben">
                        <i data-lucide="monitor-off" class="w-4 h-4"></i>
                    </button>
                    <!-- Eigene Rolle kann man nicht ändern -->
                    <button onclick="updateRolePrompt(${s.id}, '${s.username}', '${s.role}')" class="px-2 py-1 border border-tac-border text-tac-muted hover:text-purple-400 hover:border-purple-400/50 transition-colors" title="Rolle ändern">
                        <i data-lucide="shield" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = rows;
    lucide.createIcons({ nodes: [tbody] });
}

function resetHwidPrompt(id, username) {
    if(!confirm(`Möchtest du wirklich die Geräte-Sperre (HWID) für ${username} aufheben? Der Nutzer kann sich dann von einem anderen Gerät anmelden.`)) return;

    window.api.resetStaffHwid(id)
        .then(() => {
            showStatus && showStatus(`HWID für ${username} erfolgreich zurückgesetzt.`, 'success');
            loadStaffManagement();
        })
        .catch(e => {
            showStatus && showStatus(`Fehler beim HWID-Reset: ${e.message}`, 'error');
        });
}

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
        .catch(e => {
            showStatus && showStatus(`Fehler bei Rollenänderung: ${e.message}`, 'error');
        });
}

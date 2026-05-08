// ─── Dev Portal ──────────────────────────────────────────────────────────────
// Handles Tasks (Kanban), Server Logs, and Discord Changelog Generator.

// ─── Kanban Board ────────────────────────────────────────────────────────────

let devTasks = [];
let devUsers = []; // cache of dev_portal_users for dropdown + headshots

async function loadDevUsers() {
    try {
        const data = await window.api.getDevUsers();
        devUsers = data.users ?? [];
        renderUsersTab();
    } catch (e) {
        console.warn('[Dev] Users laden fehlgeschlagen:', e);
    }
}

function getUserByUsername(username) {
    return devUsers.find(u => u.username === username) ?? null;
}

function renderUsersTab() {
    const grid = document.getElementById('users-grid');
    if (!grid) return;
    if (devUsers.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center font-mono text-xs text-tac-muted py-10">KEINE NUTZER GEFUNDEN</p>`;
        return;
    }
    grid.innerHTML = devUsers.map(u => `
        <div class="bg-tac-panel border border-tac-border p-4 flex items-center gap-3 hover:border-tac-amber/40 transition-colors">
            <img src="${escHtml(u.avatar_url || '')}" onerror="this.style.display='none'" alt=""
                class="w-10 h-10 rounded border border-tac-border flex-shrink-0 bg-tac-dark">
            <div class="min-w-0">
                <p class="font-mono text-xs text-white truncate">${escHtml(u.username)}</p>
                <p class="font-mono text-[9px] text-zinc-600 mt-0.5">Zuletzt: ${fmtDate(u.last_seen)}</p>
            </div>
        </div>`).join('');
}

async function loadTasks() {
    const container = document.getElementById('kanban-board');
    if (!container) return;
    try {
        const data = await window.api.getDevTasks();
        devTasks = data.tasks ?? [];
        renderKanban();
    } catch (e) {
        console.error('[Dev] Tasks laden fehlgeschlagen:', e);
        if (window.auth?.showToast) window.auth.showToast('Tasks konnten nicht geladen werden', 'error', 4000);
    }
}

function renderKanban() {
    const columns = { todo: 'todo-tasks', inprogress: 'inprogress-tasks', done: 'done-tasks' };
    const counts  = { todo: 0, inprogress: 0, done: 0 };

    Object.values(columns).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    devTasks.forEach(task => {
        const col = columns[task.status];
        if (!col) return;
        counts[task.status]++;
        const el = document.getElementById(col);
        if (el) el.appendChild(buildTaskCard(task));
    });

    // Update column counts
    const countTodo = document.getElementById('count-todo');
    const countInp  = document.getElementById('count-inprogress');
    const countDone = document.getElementById('count-done');
    if (countTodo) countTodo.textContent = counts.todo;
    if (countInp)  countInp.textContent  = counts.inprogress;
    if (countDone) countDone.textContent = counts.done;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildTaskCard(task) {
    const priorityColors = { low: 'text-tac-green border-tac-green/30', medium: 'text-tac-amber border-tac-amber/30', high: 'text-tac-red border-tac-red/30' };
    const statusFlow = { todo: { prev: null, next: 'inprogress' }, inprogress: { prev: 'todo', next: 'done' }, done: { prev: 'inprogress', next: null } };
    const flow = statusFlow[task.status];
    const pColor = priorityColors[task.priority] ?? priorityColors.medium;

    const div = document.createElement('div');
    div.className = 'bg-tac-dark border border-tac-border p-3 group hover:border-tac-amber/40 transition-colors';
    div.dataset.taskId = task.id;

    div.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-2">
            <p class="font-mono text-xs text-white font-medium leading-snug flex-1">${escHtml(task.title)}</p>
            <span class="font-mono text-[9px] px-1.5 py-0.5 border ${pColor} uppercase flex-shrink-0">${task.priority}</span>
        </div>
        ${task.description ? `<p class="font-mono text-[10px] text-tac-muted mb-2 leading-relaxed">${escHtml(task.description)}</p>` : ''}
        ${task.assigned_to ? (() => {
            const u = getUserByUsername(task.assigned_to);
            const img = u?.avatar_url ? `<img src="${escHtml(u.avatar_url)}" onerror="this.src=''" class="w-4 h-4 rounded-full border border-tac-border inline-block mr-1 align-middle">` : `<i data-lucide="user" class="w-3 h-3 inline mr-1"></i>`;
            return `<p class="font-mono text-[9px] text-zinc-400 mb-2 flex items-center gap-1">${img}${escHtml(task.assigned_to)}</p>`;
        })() : ''}
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-tac-border">
            <p class="font-mono text-[9px] text-zinc-600">${escHtml(task.created_by_username)} · ${fmtDate(task.created_at)}</p>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ${flow.prev ? `<button onclick="moveTask(${task.id},'${flow.prev}')" class="p-1 hover:text-tac-amber transition-colors" title="Zurück"><i data-lucide="chevron-left" class="w-3 h-3"></i></button>` : ''}
                <button onclick="openEditTask(${task.id})" class="p-1 hover:text-tac-amber transition-colors" title="Bearbeiten"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                <button onclick="deleteTask(${task.id})" class="p-1 hover:text-tac-red transition-colors" title="Löschen"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                ${flow.next ? `<button onclick="moveTask(${task.id},'${flow.next}')" class="p-1 hover:text-tac-amber transition-colors" title="Weiter"><i data-lucide="chevron-right" class="w-3 h-3"></i></button>` : ''}
            </div>
        </div>`;
    return div;
}

async function moveTask(id, newStatus) {
    try {
        await window.api.updateDevTask(id, { status: newStatus });
        const task = devTasks.find(t => t.id === id);
        if (task) task.status = newStatus;
        renderKanban();
    } catch (e) {
        window.auth?.showToast('Status-Änderung fehlgeschlagen', 'error', 3000);
    }
}

async function deleteTask(id) {
    if (!confirm('Task wirklich löschen?')) return;
    try {
        await window.api.deleteDevTask(id);
        devTasks = devTasks.filter(t => t.id !== id);
        renderKanban();
        window.auth?.showToast('Task gelöscht', 'success', 3000);
    } catch (e) {
        window.auth?.showToast('Löschen fehlgeschlagen', 'error', 3000);
    }
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

function openNewTask(defaultStatus = 'todo') {
    document.getElementById('task-modal-title').textContent = 'NEUER TASK';
    document.getElementById('task-id').value = '';
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-desc-input').value = '';
    document.getElementById('task-priority-input').value = 'medium';
    document.getElementById('task-assigned-input').value = '';
    document.getElementById('task-status-input').value = defaultStatus;
    renderAssignDropdown('');
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
    document.getElementById('task-title-input').focus();
}

function openEditTask(id) {
    const task = devTasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('task-modal-title').textContent = 'TASK BEARBEITEN';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-desc-input').value = task.description ?? '';
    document.getElementById('task-priority-input').value = task.priority;
    document.getElementById('task-assigned-input').value = task.assigned_to ?? '';
    document.getElementById('task-status-input').value = task.status;
    renderAssignDropdown(task.assigned_to ?? '');
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
    document.getElementById('task-title-input').focus();
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('flex');
}

// ─── Custom User Assign Dropdown ─────────────────────────────────────────────

function renderAssignDropdown(selectedUsername) {
    const wrapper = document.getElementById('assign-dropdown-wrapper');
    if (!wrapper) return;

    const current = selectedUsername || '';
    const selectedUser = getUserByUsername(current);

    wrapper.innerHTML = `
        <div class="relative" id="assign-dd-root">
            <button type="button" onclick="toggleAssignDropdown()"
                class="w-full flex items-center gap-2 bg-tac-dark border border-tac-border px-3 py-2 font-mono text-xs text-left hover:border-tac-amber/60 transition-colors focus:outline-none focus:border-tac-amber"
                id="assign-dd-btn">
                ${selectedUser
                    ? `<img src="${escHtml(selectedUser.avatar_url)}" onerror="this.style.display='none'" class="w-5 h-5 rounded-full border border-tac-border flex-shrink-0">
                       <span class="text-white">${escHtml(selectedUser.username)}</span>`
                    : `<i data-lucide="user" class="w-4 h-4 text-zinc-600 flex-shrink-0"></i>
                       <span class="text-zinc-600">Nicht zugewiesen</span>`}
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-zinc-600 ml-auto flex-shrink-0"></i>
            </button>
        </div>`;

    // Create or update menu in body to avoid clipping by modal clip-path
    let menu = document.getElementById('assign-dd-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'assign-dd-menu';
        menu.className = 'hidden fixed bg-tac-panel border border-tac-border shadow-xl mt-0.5 max-h-48 overflow-y-auto';
        menu.style.zIndex = '10000';
        document.body.appendChild(menu);
    }
    menu.innerHTML = `
        <div class="p-1.5 border-b border-tac-border">
            <input type="text" id="assign-dd-search" placeholder="Suchen..."
                oninput="filterAssignDropdown(this.value)"
                class="w-full bg-tac-dark border border-tac-border px-2 py-1.5 font-mono text-[10px] text-white placeholder-zinc-600 outline-none focus:border-tac-amber transition-colors">
        </div>
        <div id="assign-dd-list">
            ${buildAssignOptions(current, '')}
        </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [wrapper, menu] });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeAssignDropdownOnOutside, { once: false });
    }, 0);
}

function buildAssignOptions(selectedUsername, filter) {
    const items = [{ username: '', avatar_url: '', roblox_id: '' }, ...devUsers]
        .filter(u => !filter || u.username.toLowerCase().includes(filter.toLowerCase()));

    return items.map(u => {
        const isSelected = u.username === selectedUsername;
        if (!u.username) {
            return `<button type="button" onclick="selectAssignUser('')"
                class="w-full flex items-center gap-2 px-3 py-2 font-mono text-[10px] text-zinc-500 hover:bg-tac-card hover:text-white transition-colors ${isSelected ? 'bg-tac-card' : ''}">
                <i data-lucide="user-x" class="w-3.5 h-3.5 flex-shrink-0"></i>
                <span>Nicht zugewiesen</span>
            </button>`;
        }
        return `<button type="button" onclick="selectAssignUser('${escHtml(u.username)}')"
            class="w-full flex items-center gap-2 px-3 py-2 font-mono text-[10px] hover:bg-tac-card transition-colors ${isSelected ? 'bg-tac-card text-tac-amber' : 'text-zinc-300'}">
            <img src="${escHtml(u.avatar_url || '')}" onerror="this.style.display='none'" class="w-5 h-5 rounded-full border border-tac-border flex-shrink-0 bg-tac-dark">
            <span>${escHtml(u.username)}</span>
        </button>`;
    }).join('');
}

function toggleAssignDropdown() {
    const menu = document.getElementById('assign-dd-menu');
    const btn = document.getElementById('assign-dd-btn');
    if (!menu || !btn) return;
    
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.width = `${rect.width}px`;
        menu.classList.remove('hidden');
        setTimeout(() => document.getElementById('assign-dd-search')?.focus(), 50);
    } else {
        menu.classList.add('hidden');
    }
}

function filterAssignDropdown(query) {
    const list = document.getElementById('assign-dd-list');
    const selected = document.getElementById('task-assigned-input')?.value ?? '';
    if (list) list.innerHTML = buildAssignOptions(selected, query);
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [list] });
}

function selectAssignUser(username) {
    const input = document.getElementById('task-assigned-input');
    if (input) input.value = username;
    renderAssignDropdown(username);
    const menu = document.getElementById('assign-dd-menu');
    if (menu) menu.classList.add('hidden');
}

function closeAssignDropdownOnOutside(e) {
    const root = document.getElementById('assign-dd-root');
    const menu = document.getElementById('assign-dd-menu');
    if (root && !root.contains(e.target) && menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
}

async function saveTask() {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title-input').value.trim();
    if (!title) { window.auth?.showToast('Titel ist Pflicht', 'warn', 3000); return; }

    const data = {
        title,
        description: document.getElementById('task-desc-input').value.trim(),
        priority:    document.getElementById('task-priority-input').value,
        assigned_to: document.getElementById('task-assigned-input').value.trim(),
        status:      document.getElementById('task-status-input').value,
    };

    try {
        if (id) {
            await window.api.updateDevTask(Number(id), data);
            const idx = devTasks.findIndex(t => t.id === Number(id));
            if (idx !== -1) devTasks[idx] = { ...devTasks[idx], ...data };
            window.auth?.showToast('Task aktualisiert', 'success', 3000);
        } else {
            const result = await window.api.createDevTask(data);
            devTasks.unshift(result.task);
            window.auth?.showToast('Task erstellt', 'success', 3000);
        }
        renderKanban();
        closeTaskModal();
    } catch (e) {
        window.auth?.showToast('Speichern fehlgeschlagen', 'error', 3000);
    }
}

// ─── Server Logs ──────────────────────────────────────────────────────────────

async function loadServerLogs() {
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center font-mono text-xs text-tac-muted">LADE...</td></tr>`;
    try {
        const data = await window.api.getDevLogs();
        const logs = data.logs ?? [];
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center font-mono text-xs text-tac-muted">KEINE EINTRÄGE</td></tr>`;
            return;
        }
        tbody.innerHTML = logs.map(log => {
            const statusColor = log.status === 'COMPLETED' ? 'text-tac-green' : log.status === 'FAILED' ? 'text-tac-red' : 'text-tac-amber';
            return `<tr class="border-b border-tac-border hover:bg-tac-card/50 transition-colors">
                <td class="px-4 py-3 font-mono text-xs text-white">${escHtml(log.action)}</td>
                <td class="px-4 py-3 font-mono text-xs text-zinc-400">${escHtml(log.developer_name)}</td>
                <td class="px-4 py-3 font-mono text-xs text-zinc-500">${fmtDate(log.created_at)}</td>
                <td class="px-4 py-3"><span class="font-mono text-[9px] ${statusColor} border border-current/30 px-2 py-0.5">${escHtml(log.status)}</span></td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center font-mono text-xs text-tac-red">LADEFEHLER</td></tr>`;
    }
}

function openNewLog() {
    document.getElementById('log-action-input').value = '';
    document.getElementById('log-status-input').value = 'COMPLETED';
    document.getElementById('log-notes-input').value = '';
    document.getElementById('log-modal').classList.remove('hidden');
    document.getElementById('log-modal').classList.add('flex');
}

function closeLogModal() {
    document.getElementById('log-modal').classList.add('hidden');
    document.getElementById('log-modal').classList.remove('flex');
}

async function saveLog() {
    const action = document.getElementById('log-action-input').value.trim();
    if (!action) { window.auth?.showToast('Aktion ist Pflicht', 'warn', 3000); return; }
    const data = {
        action,
        status: document.getElementById('log-status-input').value,
        notes:  document.getElementById('log-notes-input').value.trim(),
    };
    try {
        await window.api.createDevLog(data);
        closeLogModal();
        await loadServerLogs();
        window.auth?.showToast('Log-Eintrag erstellt', 'success', 3000);
    } catch (e) {
        window.auth?.showToast('Erstellen fehlgeschlagen', 'error', 3000);
    }
}

// ─── Discord Changelog Generator ─────────────────────────────────────────────

// In-memory list of feature objects: { name: string, details: string }
let clAddedFeatures   = [];
let clRemovedFeatures = [];

function addClFeature(type) {
    if (type === 'added')   clAddedFeatures.push({ name: '', details: '' });
    else                    clRemovedFeatures.push({ name: '', details: '' });
    renderClFeatures();
    updateChangelogPreview();
}

function removeClFeature(type, index) {
    if (type === 'added')   clAddedFeatures.splice(index, 1);
    else                    clRemovedFeatures.splice(index, 1);
    renderClFeatures();
    updateChangelogPreview();
}

function onClFeatureChange(type, index, field, value) {
    const arr = type === 'added' ? clAddedFeatures : clRemovedFeatures;
    if (arr[index]) arr[index][field] = value;
    updateChangelogPreview();
}

function renderClFeatures() {
    renderClFeatureList('cl-added-list',   clAddedFeatures,   'added',   'tac-green');
    renderClFeatureList('cl-removed-list', clRemovedFeatures, 'removed', 'tac-red');
}

function renderClFeatureList(containerId, features, type, accentColor) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (features.length === 0) {
        el.innerHTML = `<p class="font-mono text-[9px] text-zinc-600 py-2 text-center">Keine Features hinzugefügt</p>`;
        return;
    }
    el.innerHTML = features.map((f, i) => `
        <div class="border border-tac-border bg-tac-dark p-2.5 space-y-2">
            <div class="flex items-center gap-2">
                <span class="font-mono text-[9px] text-${accentColor} flex-shrink-0">${type === 'added' ? '+' : '-'}</span>
                <input type="text" value="${escHtml(f.name)}" placeholder="Kurzname des Features..."
                    oninput="onClFeatureChange('${type}',${i},'name',this.value)"
                    class="flex-1 bg-tac-panel border border-tac-border px-2 py-1 font-mono text-[10px] text-white placeholder-zinc-600 focus:border-tac-amber outline-none transition-colors">
                <button type="button" onclick="removeClFeature('${type}',${i})"
                    class="p-1 text-zinc-600 hover:text-tac-red transition-colors flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <textarea rows="2" placeholder="Details (eine pro Zeile)..."
                oninput="onClFeatureChange('${type}',${i},'details',this.value)"
                class="w-full bg-tac-panel border border-tac-border px-2 py-1 font-mono text-[10px] text-white placeholder-zinc-600 focus:border-tac-amber outline-none transition-colors resize-none">${escHtml(f.details)}</textarea>
        </div>`).join('');
}

function updateChangelogPreview() {
    const title     = document.getElementById('cl-title')?.value.trim()    || '{Update_Title}';
    const discordId = document.getElementById('cl-discord-id')?.value.trim() || '{DiscordId}';
    const roleId1   = document.getElementById('cl-role1')?.value.trim()    || '{RoleId1}';
    const roleId2   = document.getElementById('cl-role2')?.value.trim()    || '{RoleId2}';

    let diffContent = '';

    clAddedFeatures.forEach(f => {
        const name = f.name.trim() || '{Feature Name}';
        diffContent += `+ ${name}\n`;
        const details = f.details.split('\n').map(l => l.trim()).filter(Boolean);
        details.forEach(d => { diffContent += `  * ${d}\n`; });
    });

    if (clAddedFeatures.length > 0 && clRemovedFeatures.length > 0) diffContent += ' \n';

    clRemovedFeatures.forEach(f => {
        const name = f.name.trim() || '{Feature Name}';
        diffContent += `- ${name}\n`;
        const details = f.details.split('\n').map(l => l.trim()).filter(Boolean);
        details.forEach(d => { diffContent += `  * ${d}\n`; });
    });

    const output =
        `## ${title}\n` +
        `-# Ping: <@&1237422623928094854>\n` +
        ` \n` +
        `\`\`\`diff\n` +
        diffContent +
        ` \n` +
        `\`\`\`\n` +
        ` \n` +
        `MfG <@${discordId}> | <@&${roleId1}> u. <@&${roleId2}>`;

    const previewEl = document.getElementById('cl-preview');
    if (previewEl) previewEl.textContent = output;
}

function copyChangelog() {
    const text = document.getElementById('cl-preview')?.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
        window.auth?.showToast('Changelog kopiert!', 'success', 3000);
    }).catch(() => {
        window.auth?.showToast('Kopieren fehlgeschlagen', 'error', 3000);
    });
}

// ─── Discord Linking ──────────────────────────────────────────────────────────

function loadDiscordLink() {
    const saved = localStorage.getItem('bwrp_dev_discord_id') ?? '';
    const el = document.getElementById('cl-discord-id');
    if (el && saved) { el.value = saved; updateChangelogPreview(); }
    const badge = document.getElementById('discord-linked-badge');
    if (badge) badge.classList.toggle('hidden', !saved);
}

function saveDiscordId() {
    const id = document.getElementById('discord-link-input')?.value.trim();
    if (!id) return;
    localStorage.setItem('bwrp_dev_discord_id', id);
    const el = document.getElementById('cl-discord-id');
    if (el) { el.value = id; updateChangelogPreview(); }
    const badge = document.getElementById('discord-linked-badge');
    if (badge) badge.classList.remove('hidden');
    window.auth?.showToast('Discord ID gespeichert', 'success', 3000);
    document.getElementById('discord-link-input').value = '';
}

// ─── Dev Tab Navigation ───────────────────────────────────────────────────────

window.showDevTab = function(tabId) {
    document.querySelectorAll('.dev-tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    document.querySelectorAll('.dev-nav-btn').forEach(btn => {
        btn.classList.remove('text-tac-amber', 'nav-active', 'bg-tac-amber/10', 'border-tac-amber');
        btn.classList.add('text-zinc-500', 'border-transparent');
    });
    const tab = document.getElementById(`dev-tab-${tabId}`);
    if (tab) { tab.classList.remove('hidden'); tab.classList.add('block'); }
    const btn = document.querySelector(`.dev-nav-btn[data-tab="${tabId}"]`);
    if (btn) {
        btn.classList.remove('text-zinc-500', 'border-transparent');
        btn.classList.add('text-tac-amber', 'nav-active', 'bg-tac-amber/10', 'border-tac-amber');
    }
    localStorage.setItem('bwrp_dev_active_tab', tabId);

    if (tabId === 'logs')  loadServerLogs();
    if (tabId === 'users') renderUsersTab();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.devPortal = {
    loadTasks, loadDevUsers, loadServerLogs, renderUsersTab,
    openNewTask, openEditTask, closeTaskModal, saveTask,
    moveTask, deleteTask, openNewLog, closeLogModal, saveLog,
    updateChangelogPreview, copyChangelog, loadDiscordLink, saveDiscordId,
    addClFeature, removeClFeature, renderClFeatures,
    renderAssignDropdown, selectAssignUser,
    showDevTab: window.showDevTab,
};

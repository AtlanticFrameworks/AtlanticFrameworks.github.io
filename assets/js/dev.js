// ─── Dev Portal ──────────────────────────────────────────────────────────────
// Handles Tasks (Kanban), Server Logs, and Discord Changelog Generator.

// ─── Kanban Board ────────────────────────────────────────────────────────────

let devTasks = [];

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
        ${task.assigned_to ? `<p class="font-mono text-[9px] text-zinc-500 mb-2"><i data-lucide="user" class="w-3 h-3 inline mr-1"></i>${escHtml(task.assigned_to)}</p>` : ''}
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
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-modal').classList.add('flex');
    document.getElementById('task-title-input').focus();
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('flex');
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

function updateChangelogPreview() {
    const title       = document.getElementById('cl-title').value.trim()   || '{Update_Title}';
    const addedRaw    = document.getElementById('cl-added').value.trim();
    const removedRaw  = document.getElementById('cl-removed').value.trim();
    const discordId   = document.getElementById('cl-discord-id').value.trim() || '{DiscordId}';
    const roleId1     = document.getElementById('cl-role1').value.trim()   || '{RoleId1}';
    const roleId2     = document.getElementById('cl-role2').value.trim()   || '{RoleId2}';

    const addedLines    = addedRaw   ? addedRaw.split('\n').map(l => l.trim()).filter(Boolean) : [];
    const removedLines  = removedRaw ? removedRaw.split('\n').map(l => l.trim()).filter(Boolean) : [];

    const addedBlock   = addedLines.map(l => `  * ${l}`).join('\n');
    const removedBlock = removedLines.map(l => `  * ${l}`).join('\n');

    let output = `## ${title}\n-# Ping: <@&1237422623928094854> \n\n\`\`\`diff\n`;
    if (addedLines.length > 0)   output += `+ Added Feature\n${addedBlock}\n`;
    if (addedLines.length > 0 && removedLines.length > 0) output += '\n';
    if (removedLines.length > 0) output += `- Removed Feature\n${removedBlock}\n`;
    output += `MfG <@${discordId}> | <@&${roleId1}> u. <@&${roleId2}>\n\`\`\``;

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

    if (tabId === 'logs') loadServerLogs();
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
    loadTasks, loadServerLogs, openNewTask, openEditTask, closeTaskModal, saveTask,
    moveTask, deleteTask, openNewLog, closeLogModal, saveLog,
    updateChangelogPreview, copyChangelog, loadDiscordLink, saveDiscordId,
    showDevTab: window.showDevTab,
};

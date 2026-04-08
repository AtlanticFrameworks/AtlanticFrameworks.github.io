/**
 * db.js – Thin compatibility layer over the new api.js client
 * Replaces the old mock/proxy approach with real D1-backed API calls.
 * Called by team.html → enterDashboard → initDatabase()
 */

let syncInterval = null;

async function initDatabase() {
    console.log('[DB] Initialisiere via Worker API...');
    await refreshDashboardData();

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(refreshDashboardData, 30000);
}

async function refreshDashboardData() {
    try {
        const [statusData, activityData] = await Promise.all([
            window.api.getStatus(),
            window.api.getActivity(),
        ]);
        updateStatusUI(statusData.status ?? []);
        updateActivityUI(activityData.activity ?? []);
    } catch (e) {
        console.warn('[DB] Dashboard-Daten konnten nicht geladen werden:', e.message);
    }
}

function updateStatusUI(data) {
    if (!Array.isArray(data)) return;
    data.forEach(item => {
        const elMap = { 'Roblox API': 'status-roblox', 'Discord Bot': 'status-discord', 'Database': 'status-db' };
        const el = document.getElementById(elMap[item.service]);
        if (!el) return;
        el.textContent = item.status;
        el.className = 'font-bold';
        const s = item.status.toUpperCase();
        if (s === 'OPERATIONAL' || s === 'ONLINE' || s.includes('SYNCED')) el.classList.add('text-tac-green');
        else if (s === 'OFFLINE' || s === 'DOWN') el.classList.add('text-tac-red');
        else el.classList.add('text-tac-amber');
    });
}

function updateActivityUI(data) {
    const feed = document.getElementById('activity-feed');
    if (!feed || !Array.isArray(data)) return;
    feed.innerHTML = '';
    if (!data.length) {
        feed.innerHTML = '<div class="text-tac-muted italic">Keine aktuellen Aktivitäten.</div>';
        return;
    }
    data.forEach(log => {
        const time = log.created_at
            ? new Date(log.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        const row = document.createElement('div');
        row.className = 'flex gap-2 animate-fade-in mb-1';
        row.innerHTML = `
            <span class="text-tac-muted mt-0.5 flex-shrink-0">[${time}]</span>
            <span class="text-white block">
                <span class="text-tac-amber font-bold">${log.username ?? 'System'}</span>: ${log.action}
                ${log.resource_id ? `<span class="text-tac-muted text-[9px] ml-1 uppercase">(${log.resource} #${log.resource_id})</span>` : ''}
            </span>`;
        feed.appendChild(row);
    });
}

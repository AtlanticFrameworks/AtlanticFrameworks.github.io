// db.js - Backend Data Handler (Pure JS / PHP Migration)

// --- MOCK OR BACKEND FETCHING ---

/**
 * Fetches the latest server status.
 * Future: Update this to fetch from a local PHP endpoint (e.g. /api/status.php)
 */
async function fetchServerStatus() {
    try {
        // Uncomment below to fetch from PHP backend once implemented:
        // const res = await fetch('/api/status.php');
        // if(res.ok) return await res.json();
    } catch(e) {
        console.error("Status fetch logic not yet implemented or failed", e);
    }
    return getMockStatus();
}

/**
 * Fetches the latest activity logs.
 * Future: Update this to fetch from a local PHP endpoint (e.g. /api/activity.php)
 */
async function fetchActivityLogs() {
    try {
        // Uncomment below to fetch from PHP backend once implemented:
        // const res = await fetch('/api/activity.php');
        // if(res.ok) return await res.json();
    } catch(e) {
        console.error("Activity fetch logic not yet implemented or failed", e);
    }
    return getMockActivity();
}

// --- MOCK DATA FALLBACKS ---
function getMockStatus() {
    return [
        { service: 'Roblox API', status: 'OPERATIONAL' },
        { service: 'Discord Bot', status: 'ONLINE' },
        { service: 'Database', status: 'SYNCED (Local)' }
    ];
}

function getMockActivity() {
    return [
        { user: 'System', action: 'System Init', details: 'Initialized PHP local mode', created_at: new Date().toISOString() }
    ];
}

// --- INITIALIZATION ---
let syncInterval = null;

async function initDatabase() {
    console.log("Initializing local data syncing...");

    // Initial Fetch
    const statusData = await fetchServerStatus();
    updateStatusUI(statusData);

    const activityData = await fetchActivityLogs();
    updateActivityUI(activityData);

    // Simulated Realtime Polling (Replacing Supabase Websockets)
    if(syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
        updateStatusUI(await fetchServerStatus());
        updateActivityUI(await fetchActivityLogs());
    }, 15000); // Poll every 15 seconds
}

// --- UI UPDATERS ---
function updateStatusUI(data) {
    if (!data) return;

    data.forEach(item => {
        let elId = '';
        if (item.service === 'Roblox API') elId = 'status-roblox';
        if (item.service === 'Discord Bot') elId = 'status-discord';
        if (item.service === 'Database') elId = 'status-db';

        const el = document.getElementById(elId);
        if (el) {
            el.textContent = item.status;
            // Update Color
            el.className = 'font-bold';
            if (item.status === 'OPERATIONAL' || item.status === 'ONLINE' || item.status.includes('SYNCED')) {
                el.classList.add('text-tac-green');
            } else if (item.status === 'OFFLINE') {
                el.classList.add('text-tac-red');
            } else {
                el.classList.add('text-tac-amber');
            }
        }
    });
}

function updateActivityUI(data) {
    const feed = document.getElementById('activity-feed');
    if (!feed || !data) return;

    feed.innerHTML = '';

    if (data.length === 0) {
        feed.innerHTML = '<div class="text-tac-muted italic">Keine aktuellen Aktivitäten.</div>';
        return;
    }

    data.forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('div');
        row.className = 'flex gap-2 animate-fade-in mb-1';
        row.innerHTML = `
            <span class="text-tac-muted mt-0.5">[${time}]</span>
            <span class="text-white block">
                <span class="text-tac-amber font-bold">${log.user}</span>: ${log.action} 
                <span class="text-tac-muted text-[9px] ml-1 uppercase">(${log.details})</span>
            </span>
        `;
        feed.appendChild(row);
    });
}

// Auto-init if on dashboard
document.addEventListener('DOMContentLoaded', () => {
    // We can call initDatabase() here or from team.html
});

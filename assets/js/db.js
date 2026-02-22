// db.js - Supabase Database Handler

// --- CONFIGURATION ---
// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://yhqfnjbukyosfhytsojo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlocWZuamJ1a3lvc2ZoeXRzb2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjYzMzAsImV4cCI6MjA4MzgwMjMzMH0.OKBMh8sEn5IiLXkdD_PSTRDvgcEnbtJc8bsyaedFsqU';

// Initialize Client
let supabase = null;

if (typeof createClient !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized");
} else {
    console.warn("Supabase credentials missing or library not loaded.");
}

// --- FUNCTIONS ---

/**
 * Fetches the latest server status from the 'server_status' table.
 * If credentials are missing, returns mock data.
 */
async function fetchServerStatus() {
    if (!supabase) return getMockStatus();

    const { data, error } = await supabase
        .from('server_status')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error fetching status:", error);
        return getMockStatus();
    }

    return data;
}

/**
 * Fetches the latest 5 activity logs.
 */
async function fetchActivityLogs() {
    if (!supabase) return getMockActivity();

    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching activity:", error);
        return getMockActivity();
    }

    return data;
}

// --- MOCK DATA FALLBACKS ---
function getMockStatus() {
    return [
        { service: 'Roblox API', status: 'OPERATIONAL' },
        { service: 'Discord Bot', status: 'ONLINE' },
        { service: 'Database', status: 'SYNCED (Mock)' }
    ];
}

function getMockActivity() {
    return [
        { user: 'System', action: 'Database', details: 'Waiting for connection...', created_at: new Date().toISOString() }
    ];
}

// --- INITIALIZATION ---
async function initDatabase() {
    if (!supabase) return;

    // Initial Fetch
    const statusData = await fetchServerStatus();
    updateStatusUI(statusData);

    const activityData = await fetchActivityLogs();
    updateActivityUI(activityData);

    // Realtime Subscription
    supabase
        .channel('public:server_status')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'server_status' }, payload => {
            console.log('Status Update:', payload);
            fetchServerStatus().then(updateStatusUI);
        })
        .subscribe();

    supabase
        .channel('public:activity_logs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
            console.log('New Activity:', payload);
            fetchActivityLogs().then(updateActivityUI);
        })
        .subscribe();
}

// UI Updaters (To be implemented or hooked into dashboard.html)
// UI Updaters
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
            if (item.status === 'OPERATIONAL' || item.status === 'ONLINE' || item.status === 'SYNCED') {
                el.classList.add('text-green-500');
            } else if (item.status === 'OFFLINE') {
                el.classList.add('text-red-500');
            } else {
                el.classList.add('text-yellow-500');
            }
        }
    });
}

function updateActivityUI(data) {
    const feed = document.getElementById('activity-feed');
    if (!feed || !data) return;

    feed.innerHTML = '';

    if (data.length === 0) {
        feed.innerHTML = '<div class="text-gray-500 italic">No recent activity.</div>';
        return;
    }

    data.forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('div');
        row.className = 'flex gap-2 animate-fade-in';
        row.innerHTML = `
            <span class="text-gray-500">[${time}]</span>
            <span class="text-white">
                <span class="text-bw-gold font-bold">${log.user}</span>: ${log.action} 
                <span class="text-gray-400 text-[10px] ml-1">(${log.details})</span>
            </span>
        `;
        feed.appendChild(row);
    });
}

// Auto-init if on dashboard
document.addEventListener('DOMContentLoaded', () => {
    // We can call initDatabase() here or from team.html
});

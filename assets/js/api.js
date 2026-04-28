/**
 * api.js – Zentraler API Client für das BWRP Staff Panel
 * Kommuniziert mit dem Cloudflare Worker via /api/*
 * Cookies werden automatisch vom Browser gesendet (credentials: 'include')
 */

const API_BASE = 'https://bwrp.net/api';  // Absolute URL: frontend is github.io, API is bwrp.net

class ApiClient {
    constructor() {
        this._refreshing = false;
        this._refreshQueue = [];
    }

    // ── Core Fetch ────────────────────────────────────────────────────────────

    async fetch(path, options = {}) {
        const res = await this._request(path, options);

        // Auto-refresh on 401
        if (res.status === 401) {
            const refreshed = await this._refresh();
            if (refreshed) return this._request(path, options);
            // Refresh failed → redirect to login
            window.auth?.logout?.();
            return res;
        }
        return res;
    }

    async _request(path, options = {}) {
        return fetch(`${API_BASE}${path}`, {
            ...options,
            credentials: 'include',   // sends HttpOnly cookies automatically
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
    }

    async _refresh() {
        if (this._refreshing) {
            // Queue up callers waiting for refresh
            return new Promise(resolve => this._refreshQueue.push(resolve));
        }
        this._refreshing = true;
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
            const ok  = res.ok;
            this._refreshQueue.forEach(resolve => resolve(ok));
            this._refreshQueue = [];
            return ok;
        } catch {
            return false;
        } finally {
            this._refreshing = false;
        }
    }

    // ── JSON Shorthand ────────────────────────────────────────────────────────

    async _parseJson(res) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) return res.json();
        const text = await res.text();
        try { return JSON.parse(text); } catch { return { error: text || `HTTP ${res.status}` }; }
    }

    async get(path) {
        const res = await this.fetch(path, { method: 'GET' });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }

    async post(path, body) {
        const res = await this.fetch(path, { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }

    async patch(path, body) {
        const res = await this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }

    // ── Auth Endpoints ────────────────────────────────────────────────────────

    async login(code, redirectUri, hwid) {
        const res = await this._request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ code, redirect_uri: redirectUri, hwid }),
        });
        return { ok: res.ok, data: await res.json() };
    }

    async logout() {
        await this._request('/auth/logout', { method: 'POST' }).catch(() => {});
    }

    // ── Staff Endpoints ───────────────────────────────────────────────────────

    async getMe()       { return this.get('/staff/me'); }
    async getStats()    { return this.get('/staff/stats'); }
    async getRoster()   { return this.get('/staff/roster'); }
    async getStatus()   { return this.get('/staff/status'); }
    async getActivity() { return this.get('/staff/activity'); }
    async getSessions() { return this.get('/staff/sessions'); }

    // ── Watchlist Endpoints ───────────────────────────────────────────────────

    async getWatchlist()              { return this.get('/watchlist'); }
    async checkWatchlist(robloxId)    { return this.get(`/watchlist/check/${robloxId}`); }
    async addToWatchlist(data)        { return this.post('/watchlist', data); }
    async removeFromWatchlist(id)     {
        const res = await this.fetch(`/watchlist/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }

    // ── Shift Endpoints ───────────────────────────────────────────────────────

    async startShift()          { return this.post('/shifts/start', {}); }
    async getActiveShift()      { return this.get('/shifts/active'); }
    async endShift(metrics)     { return this.post('/shifts/end', metrics); }
    async getAnalytics()        { return this.get('/shifts/analytics'); }
    async getAllShifts(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.get(`/shifts/all${q ? '?' + q : ''}`);
    }

    // ── Moderation Endpoints ──────────────────────────────────────────────────

    async getAllCases(params = {})     {
        const q = new URLSearchParams(params).toString();
        return this.get(`/moderation/all${q ? '?' + q : ''}`);
    }
    async getPlayerCases(robloxId)    { return this.get(`/moderation/cases/${robloxId}`); }
    async createCase(data)            { return this.post('/moderation/cases', data); }
    async updateCase(caseId, patch)   { return this.patch(`/moderation/cases/${caseId}`, patch); }

    // ── Roblox Proxy ──────────────────────────────────────────────────────────

    async lookupPlayer(identifier)      { return this.get(`/roblox/player/${encodeURIComponent(identifier)}`); }
    async getServers()                  { return this.get('/roblox/servers'); }
    async getGroupRoles()               { return this.get('/roblox/group/roles'); }
    async getGroupRoleUsers(roleId)     { return this.get(`/roblox/group/roles/${roleId}/users`); }

    // ── Roblox Open Cloud ─────────────────────────────────────────────────────

    async cloudKick(targetRobloxId, targetUsername, reason) {
        return this.post('/cloud/kick', { targetRobloxId, targetUsername, reason });
    }
    async cloudBan(targetRobloxId, targetUsername, reason, displayReason, durationDays = null) {
        return this.post('/cloud/ban', { targetRobloxId, targetUsername, reason, displayReason, durationDays });
    }
    async cloudUnban(targetRobloxId, targetUsername) {
        return this.post('/cloud/unban', { targetRobloxId, targetUsername });
    }
    async getCloudRestriction(userId) {
        return this.get(`/cloud/restriction/${userId}`);
    }

    // ── Management Endpoints ──────────────────────────────────────────────────

    async getStaffManagement()          { return this.get('/mgmt/users'); }
    async resetStaffHwid(id)            { return this.patch(`/mgmt/users/${id}/hwid-reset`, {}); }
    async updateStaffRole(id, role)     { return this.patch(`/mgmt/users/${id}/role`, { role }); }
    async getUserActivity(id)           { return this.get(`/mgmt/users/${id}/activity`); }

    // ── Dynamic Roles Endpoints ───────────────────────────────────────────────

    async getPermissions()              { return this.get('/roles/permissions'); }
    async getRoles()                    { return this.get('/roles'); }
    async createRole(data)              { return this.post('/roles', data); }
    async updateRole(id, data)          { return this.patch(`/roles/${id}`, data); }
    async deleteRole(id) {
        const res = await this.fetch(`/roles/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }
    async getUserRoles(userId)          { return this.get(`/roles/users/${userId}`); }
    async assignRoleToUser(userId, roleId)  { return this.post(`/roles/users/${userId}/assign`, { roleId }); }
    async removeRoleFromUser(userId, roleId) {
        const res = await this.fetch(`/roles/users/${userId}/${roleId}`, { method: 'DELETE' });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }

    // ── Notes Endpoints ───────────────────────────────────────────────────────

    async getNotes()                    { return this.get('/notes'); }
    async saveNotes(content)            {
        const res = await this.fetch('/notes', { method: 'PUT', body: JSON.stringify({ content }) });
        if (!res.ok) throw new ApiError(await this._parseJson(res), res.status);
        return this._parseJson(res);
    }
    async pinTicket(data)               { return this.post('/notes/pin', data); }
    async unpinTicket(incidentId)       { return this.post('/notes/unpin', { incidentId }); }

    // ── Server Power Operations ───────────────────────────────────────────────

    async shutdownServer(serverJobId)   { return this.post('/cloud/servers/shutdown', { serverJobId }); }
    async restartAllServers(extraProtectedJobIds = []) {
        return this.post('/cloud/servers/restart-all', { extraProtectedJobIds });
    }

    // ── Discord Endpoints ─────────────────────────────────────────────────────

    async sendDiscordAnnouncement(data) { return this.post('/discord/announce', data); }
    async testDiscordWebhook()          { return this.post('/discord/test', {}); }
}

class ApiError extends Error {
    constructor(data, status) {
        super(data?.error ?? 'Unbekannter API-Fehler');
        this.status = status;
        this.data   = data;
    }
}

// Global singleton
window.api = new ApiClient();
window.ApiError = ApiError;

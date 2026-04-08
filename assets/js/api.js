/**
 * api.js – Zentraler API Client für das BWRP Staff Panel
 * Kommuniziert mit dem Cloudflare Worker via /api/*
 * Cookies werden automatisch vom Browser gesendet (credentials: 'include')
 */

const API_BASE = '/api';  // Same domain via Worker Route – no CORS issues

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
            window.logout?.();
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

    async get(path) {
        const res = await this.fetch(path, { method: 'GET' });
        if (!res.ok) throw new ApiError(await res.json(), res.status);
        return res.json();
    }

    async post(path, body) {
        const res = await this.fetch(path, { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) throw new ApiError(await res.json(), res.status);
        return res.json();
    }

    async patch(path, body) {
        const res = await this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) });
        if (!res.ok) throw new ApiError(await res.json(), res.status);
        return res.json();
    }

    // ── Auth Endpoints ────────────────────────────────────────────────────────

    async login(code, redirectUri) {
        const res = await this._request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        return { ok: res.ok, data: await res.json() };
    }

    async logout() {
        await this._request('/auth/logout', { method: 'POST' }).catch(() => {});
    }

    // ── Staff Endpoints ───────────────────────────────────────────────────────

    async getMe()       { return this.get('/staff/me'); }
    async getRoster()   { return this.get('/staff/roster'); }
    async getStatus()   { return this.get('/staff/status'); }
    async getActivity() { return this.get('/staff/activity'); }
    async getSessions() { return this.get('/staff/sessions'); }

    // ── Shift Endpoints ───────────────────────────────────────────────────────

    async startShift()          { return this.post('/shifts/start', {}); }
    async getActiveShift()      { return this.get('/shifts/active'); }
    async endShift(metrics)     { return this.post('/shifts/end', metrics); }
    async getAnalytics()        { return this.get('/shifts/analytics'); }

    // ── Moderation Endpoints ──────────────────────────────────────────────────

    async getPlayerCases(robloxId)    { return this.get(`/moderation/cases/${robloxId}`); }
    async createCase(data)            { return this.post('/moderation/cases', data); }
    async updateCase(caseId, patch)   { return this.patch(`/moderation/cases/${caseId}`, patch); }

    // ── Roblox Proxy ──────────────────────────────────────────────────────────

    async lookupPlayer(identifier)      { return this.get(`/roblox/player/${encodeURIComponent(identifier)}`); }
    async getServers()                  { return this.get('/roblox/servers'); }
    async getGroupRoles()               { return this.get('/roblox/group/roles'); }
    async getGroupRoleUsers(roleId)     { return this.get(`/roblox/group/roles/${roleId}/users`); }
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

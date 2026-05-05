/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    proxies: [
        "https://bwrp.net/proxy/roblox/",
        "https://corsproxy.io/?",
        "https://api.allorigins.win/raw?url="
    ],

    /**
     * Maps a roblox.com URL to a roproxy.com URL
     */
    mapToRoProxy(url) {
        try {
            const u = new URL(url);
            if (u.hostname.endsWith('roblox.com')) {
                u.hostname = u.hostname.replace('roblox.com', 'roproxy.com');
                return u.toString();
            }
        } catch (e) {}
        return url;
    },

    async fetchWithFallbacks(targetUrl, isRobloxApi = true) {
        let lastError;
        
        // Try roproxy first if it's a roblox API
        let urlsToTry = [];
        if (isRobloxApi && targetUrl.includes('roblox.com')) {
            urlsToTry.push(this.mapToRoProxy(targetUrl));
        }
        urlsToTry.push(targetUrl);

        for (const proxy of this.proxies) {
            for (const url of urlsToTry) {
                try {
                    let fetchUrl;
                    
                    // Always encode for external proxies. 
                    // For bwrp.net, we also encode now to be safe with query params.
                    fetchUrl = `${proxy}${encodeURIComponent(url)}`;

                    const response = await fetch(fetchUrl, {
                        referrerPolicy: "no-referrer",
                        cache: "no-cache"
                    });

                    if (!response.ok) {
                        // If it's a 403 or 401, it's a proxy/block issue, try next
                        console.warn(`[AssetService] Proxy ${proxy} returned ${response.status} for ${url}`);
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    return response;

                } catch (e) {
                    lastError = e;
                    continue;
                }
            }
        }
        throw lastError || new Error("All proxies failed");
    },

    // Fetch 3D avatar metadata with multi-strategy retry.
    //
    // Why not fetchWithFallbacks?
    //   fetchWithFallbacks wraps every URL inside a proxy service, so the
    //   request still originates from a Cloudflare/datacenter IP → Roblox 403.
    //
    // Strategy A — Internal bwrpauth worker (/api/roblox/thumbnail/3d):
    //   Server-to-server with minimal headers. Works if Roblox hasn't blocked
    //   that specific Cloudflare egress IP.
    //
    // Strategy B — Direct roproxy.com from the browser:
    //   thumbnails.roproxy.com is a CORS-enabled Roblox proxy. Calling it
    //   DIRECTLY (no wrapper) means the request originates from the user's
    //   residential IP, bypassing Roblox's datacenter block entirely.
    //
    // Retry loop handles state:"Pending" — Roblox generates 3D thumbnails
    // asynchronously; the first request often returns Pending, then Completed
    // a few seconds later.
    async getAvatarMetadata(userId, onStatus = null) {
        const MAX_ATTEMPTS  = 4;
        const RETRY_DELAY   = 2500; // ms between retries

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                const msg = `Warte auf 3D-Thumbnail... (${attempt}/${MAX_ATTEMPTS - 1})`;
                if (onStatus) onStatus(msg);
                console.log(`[AssetService] ${msg}`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }

            // ── Strategy A: internal worker proxy ────────────────────────────
            try {
                const resp = await fetch(`/api/roblox/thumbnail/3d?userId=${userId}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.state === 'Completed' && data.imageUrl) return data;
                    if (data.state === 'Pending') {
                        console.log('[AssetService] Worker proxy: state Pending, will retry');
                        // fall through to strategy B, then retry loop
                    }
                } else {
                    console.warn(`[AssetService] Worker proxy returned ${resp.status}`);
                }
            } catch (e) {
                console.warn('[AssetService] Worker proxy exception:', e.message);
            }

            // ── Strategy B: direct roproxy.com from browser ──────────────────
            // The request comes from the user's IP, not a datacenter. roproxy.com
            // provides Access-Control-Allow-Origin:* for exactly this use case.
            try {
                const resp = await fetch(
                    `https://thumbnails.roproxy.com/v1/users/avatar-3d?userId=${userId}`,
                    { cache: 'no-cache' }
                );
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.state === 'Completed' && data.imageUrl) return data;
                    if (data.state === 'Pending') {
                        console.log('[AssetService] roproxy.com: state Pending, will retry');
                        continue; // retry whole loop after delay
                    }
                    // state === 'Error' or unexpected — no point retrying
                    console.warn('[AssetService] roproxy.com: unexpected state:', data.state);
                    break;
                } else {
                    console.warn(`[AssetService] roproxy.com returned ${resp.status}`);
                }
            } catch (e) {
                // CORS error or network failure — roproxy.com may be down
                console.warn('[AssetService] roproxy.com exception:', e.message);
            }
        }

        throw new Error('3D-Avatar konnte nicht geladen werden. Bitte erneut versuchen.');
    },

    async getHeadshot(userId) {
        // Strategy A: internal worker proxy
        try {
            const resp = await fetch(`/api/roblox/thumbnail/headshot?userId=${userId}&size=420x420`);
            if (resp.ok) {
                const json = await resp.json();
                if (json.data?.[0]?.imageUrl) return json.data[0].imageUrl;
            }
        } catch (e) {}

        // Strategy B: direct roproxy.com from browser (user's IP, CORS-enabled)
        try {
            const resp = await fetch(
                `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
                { cache: 'no-cache' }
            );
            if (resp.ok) {
                const json = await resp.json();
                if (json.data?.[0]?.imageUrl) return json.data[0].imageUrl;
            }
        } catch (e) {}

        // Strategy C: generic proxy chain (last resort)
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
        const resp = await this.fetchWithFallbacks(url, true);
        const json = await resp.json();
        if (!json.data || !json.data[0]) throw new Error("Headshot not found");
        return json.data[0].imageUrl;
    },

    getProxiedUrl(url) {
        const activeProxy = this.proxies[0];
        if (url.includes(activeProxy)) return url;

        // Use RoProxy for roblox.com domains if possible
        let targetUrl = url;
        if (url.includes('roblox.com')) {
            targetUrl = this.mapToRoProxy(url);
        }

        return `${activeProxy}${encodeURIComponent(targetUrl)}`;
    },

    async fetchProxied(url, options = {}) {
        return this.fetchWithFallbacks(url, true);
    }
};

window.AssetService = AssetService;
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

    async getAvatarMetadata(userId) {
        // Try the bwrpauth worker's thumbnail proxy first — it uses minimal headers
        // that bypass Roblox's datacenter-IP block, unlike all public CORS proxies.
        try {
            const resp = await fetch(`/api/roblox/thumbnail/3d?userId=${userId}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data.imageUrl) return data;
            }
        } catch (e) {
            console.warn('[AssetService] Internal 3D thumbnail proxy failed, falling back:', e);
        }

        // Fallback: generic proxy chain
        const url = `https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`;
        const resp = await this.fetchWithFallbacks(url, true);
        const data = await resp.json();
        if (!data.imageUrl) throw new Error("No 3D image URL");
        return data;
    },

    async getHeadshot(userId) {
        // Try the bwrpauth worker's headshot proxy first
        try {
            const resp = await fetch(`/api/roblox/thumbnail/headshot?userId=${userId}&size=420x420`);
            if (resp.ok) {
                const json = await resp.json();
                if (json.data?.[0]) return json.data[0].imageUrl;
            }
        } catch (e) {
            console.warn('[AssetService] Internal headshot proxy failed, falling back:', e);
        }

        // Fallback: generic proxy chain
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
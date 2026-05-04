/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    // We are abandoning the complex Cloudflare prefix proxies.
    // Instead, we use RoProxy (the community standard) and a couple of fallbacks just in case.
    // Completely removed RoProxy. Using CorsProxy as primary.
    proxies: [
        // Let's make AllOrigins the primary proxy for now
        "https://api.allorigins.win/raw?url="
    ],

    async fetchWithFallbacks(targetUrl, isRobloxApi = true) {
        let lastError;

        for (const proxy of this.proxies) {
            try {
                // Wrap the target URL with the proxy prefix
                const fetchUrl = `${proxy}${encodeURIComponent(targetUrl)}`;

                const response = await fetch(fetchUrl, {
                    referrerPolicy: "no-referrer",
                    cache: "no-cache"
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response;

            } catch (e) {
                console.warn(`[AssetService] Proxy ${proxy} failed, trying next...`, e);
                lastError = e;
            }
        }
        throw lastError;
    },


    async getAvatarMetadata(userId) {
        // We request the standard Roblox URL, and let fetchWithFallbacks handle the RoProxy conversion
        const url = `https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`;
        const resp = await this.fetchWithFallbacks(url, true);
        const data = await resp.json();

        if (!data.imageUrl) throw new Error("No 3D image URL");
        return data;
    },

    async getHeadshot(userId) {
        // Note: avatar-headshot uses userIds (plural)
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
        const resp = await this.fetchWithFallbacks(url, true);
        const json = await resp.json();

        if (!json.data || !json.data[0]) throw new Error("Headshot not found");
        return json.data[0].imageUrl;
    },

    getProxiedUrl(url) {
        // Prevent double-proxying if the URL already has corsproxy
        if (url.includes('corsproxy.io')) {
            return url;
        }

        // Wrap the entire original URL with CorsProxy.io
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    },

    async fetchProxied(url, options = {}) {
        return this.fetchWithFallbacks(url, true);
    }
};

window.AssetService = AssetService;
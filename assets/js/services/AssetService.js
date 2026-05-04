/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    // We are abandoning the complex Cloudflare prefix proxies.
    // Instead, we use RoProxy (the community standard) and a couple of fallbacks just in case.
    proxies: [
        "direct-roproxy", // Primary: Uses RoProxy directly
        "https://corsproxy.io/?", // Fallback 1
        "https://api.allorigins.win/raw?url=" // Fallback 2
    ],

    async fetchWithFallbacks(targetUrl, isRobloxApi = true) {
        let lastError;

        for (const proxy of this.proxies) {
            try {
                let fetchUrl = targetUrl;

                // If using our primary RoProxy method, we just swap the domain name.
                if (proxy === "direct-roproxy" && isRobloxApi) {
                    fetchUrl = targetUrl.replace('roblox.com', 'roproxy.com');
                }
                // Otherwise, use standard proxy prefixing
                else if (proxy !== "direct-roproxy") {
                    fetchUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
                }

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
        // Simple logic for non-async URL generation (textures, etc)
        // We swap roblox.com -> roproxy.com or rbxcdn.com -> roproxy.com
        if (url.includes('roblox.com')) {
            return url.replace('roblox.com', 'roproxy.com');
        }
        if (url.includes('rbxcdn.com')) {
            return url.replace('rbxcdn.com', 'roproxy.com');
        }
        // Fallback to first prefix proxy
        return `${this.proxies[1]}${encodeURIComponent(url)}`;
    },

    async fetchProxied(url, options = {}) {
        return this.fetchWithFallbacks(url, true);
    }
};

window.AssetService = AssetService;
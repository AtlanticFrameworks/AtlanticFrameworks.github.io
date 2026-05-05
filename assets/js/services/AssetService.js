/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    proxies: [
        "https://bwrp.net/proxy/roblox/",
        "https://corsproxy.io/?",
        "https://api.allorigins.win/raw?url="
    ],

    async fetchWithFallbacks(targetUrl, isRobloxApi = true) {
        let lastError;

        for (const proxy of this.proxies) {
            try {
                let fetchUrl;

                // For bwrp.net proxy, we append the raw URL (it expects raw URL after the path)
                if (proxy.includes('bwrp.net')) {
                    fetchUrl = `${proxy}${targetUrl}`;
                } else {
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
        const url = `https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`;
        const resp = await this.fetchWithFallbacks(url, true);
        const data = await resp.json();

        if (!data.imageUrl) throw new Error("No 3D image URL");
        return data;
    },

    async getHeadshot(userId) {
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
        const resp = await this.fetchWithFallbacks(url, true);
        const json = await resp.json();

        if (!json.data || !json.data[0]) throw new Error("Headshot not found");
        return json.data[0].imageUrl;
    },

    getProxiedUrl(url) {
        const activeProxy = this.proxies[0];
        if (url.includes(activeProxy)) return url;

        // Same logic as fetch: raw append for bwrp, encode for others
        if (activeProxy.includes('bwrp.net')) {
            return `${activeProxy}${url}`;
        }
        return `${activeProxy}${encodeURIComponent(url)}`;
    },

    async fetchProxied(url, options = {}) {
        return this.fetchWithFallbacks(url, true);
    }
};

window.AssetService = AssetService;
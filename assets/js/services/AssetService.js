/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    proxies: [
        "https://bwrp.net/proxy/roblox/",
        "https://corsproxy.io/?",
        "https://api.codetabs.com/v1/proxy?quest="
    ],

    getProxiedUrl(url) {
        // Returns the first proxy URL for loaders that don't support async retry
        return `${this.proxies[0]}${encodeURIComponent(url)}`;
    },

    async fetchProxied(url, options = {}) {
        let lastError;
        for (const proxy of this.proxies) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl, options);
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
        const resp = await this.fetchProxied(url);
        const data = await resp.json();
        if (!data.imageUrl) throw new Error("No 3D image URL");
        return data;
    },

    async getHeadshot(userId) {
        // Note: avatar-headshot uses userIds (plural)
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
        const resp = await this.fetchProxied(url);
        const json = await resp.json();
        if (!json.data || !json.data[0]) throw new Error("Headshot not found");
        return json.data[0].imageUrl;
    }
};

window.AssetService = AssetService;

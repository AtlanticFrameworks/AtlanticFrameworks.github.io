/**
 * AssetService - Handles Roblox API, Proxies, and Asset loading
 */
const AssetService = {
    proxies: [
        // Added /api/proxy?url= to the end of your Vercel domain
        "https://roblox-char-proxy-5pnqnpplw-batuatakanerol-5232s-projects.vercel.app/api/proxy?url="
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
        // Grab the primary proxy from your array at the top of the file
        const activeProxy = this.proxies[0];

        // Prevent double-proxying if the URL already has the active proxy attached
        if (url.includes(activeProxy)) {
            return url;
        }

        // Wrap the entire original URL with your active proxy
        return `${activeProxy}${encodeURIComponent(url)}`;
    },

    async fetchProxied(url, options = {}) {
        return this.fetchWithFallbacks(url, true);
    }
};

window.AssetService = AssetService;
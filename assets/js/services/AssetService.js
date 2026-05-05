/**
 * AssetService - Handles Roblox asset and thumbnail loading.
 *
 * 3D avatar thumbnails and headshots are fetched via the bwrpauth worker
 * (/api/roblox/thumbnail/*), which authenticates server-side using Roblox
 * OAuth client credentials (thumbnail:read scope). No client-side proxies needed.
 */
const AssetService = {

    // Fetch 3D avatar metadata with retry for the "Pending" state.
    //
    // Roblox generates 3D thumbnails asynchronously — the first response often
    // has state:"Pending". We retry up to MAX_ATTEMPTS times with a short delay.
    // Authentication is handled entirely by the bwrpauth worker via OAuth.
    async getAvatarMetadata(userId, onStatus = null) {
        const MAX_ATTEMPTS = 4;
        const RETRY_DELAY  = 2500; // ms

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                const msg = `Warte auf 3D-Thumbnail... (${attempt}/${MAX_ATTEMPTS - 1})`;
                if (onStatus) onStatus(msg);
                console.log(`[AssetService] ${msg}`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }

            try {
                const resp = await fetch(`/api/roblox/thumbnail/3d?userId=${userId}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.state === 'Completed' && data.imageUrl) return data;
                    if (data.state === 'Pending') {
                        console.log('[AssetService] state Pending, retrying...');
                        continue;
                    }
                    console.warn('[AssetService] unexpected state:', data.state);
                    break;
                } else {
                    console.warn(`[AssetService] worker returned ${resp.status}`);
                }
            } catch (e) {
                console.warn('[AssetService] fetch exception:', e.message);
            }
        }

        throw new Error('3D-Avatar konnte nicht geladen werden. Bitte erneut versuchen.');
    },

    async getHeadshot(userId) {
        const resp = await fetch(`/api/roblox/thumbnail/headshot?userId=${userId}&size=420x420`);
        if (!resp.ok) throw new Error(`Headshot request failed: ${resp.status}`);
        const data = await resp.json();
        const url = data.data?.[0]?.imageUrl;
        if (!url) throw new Error('Headshot not found');
        return url;
    },
};

window.AssetService = AssetService;

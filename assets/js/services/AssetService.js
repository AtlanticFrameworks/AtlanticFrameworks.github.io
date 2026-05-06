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
    // When a Roblox OAuth access token is provided (from the poster login flow,
    // thumbnail:read scope), the request is made directly to thumbnails.roblox.com
    // from the browser — bypassing the worker proxy entirely.
    // Without a token, falls back to the bwrpauth worker (/api/roblox/thumbnail/3d).
    async getAvatarMetadata(userId, onStatus = null, accessToken = null) {
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
                let resp;
                if (accessToken) {
                    resp = await fetch(
                        `https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`,
                        { headers: { 'Authorization': `Bearer ${accessToken}` } }
                    );
                } else {
                    resp = await fetch(`/api/roblox/thumbnail/3d?userId=${userId}`);
                }

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
                    console.warn(`[AssetService] thumbnail request returned ${resp.status}`);
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

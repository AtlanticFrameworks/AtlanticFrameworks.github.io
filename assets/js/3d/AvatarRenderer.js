/**
 * AvatarRenderer.js
 * Three.js handler for Roblox 3D Avatars.
 *
 * Implements the strict workflow required by thumbnails.roblox.com:
 *   Step 1 → /api/roblox/thumbnail/3d (our auth worker, bypasses datacenter IP block)
 *   Step 2 → Direct CDN fetch of scene JSON (rbxcdn.com has CORS headers)
 *   Step 3 → getCdnUrl(hash) per-asset CDN routing — NEVER a single base URL
 *   Step 4 → LoadingManager.setURLModifier() texture interception + transparent=false fix
 */
class AvatarRenderer {
    constructor() {
        this.scene      = null;
        this.camera     = null;
        this.renderer   = null;
        this.controls   = null;
        this.model      = null;
        this.isInitialized = false;
        this.aabb       = null; // stored from scene JSON for camera reference
    }

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.scene  = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true  // required for captureAngles / export
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);

        // Three-point lighting so both sides of the avatar are visible
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
        keyLight.position.set(5, 10, 7.5);
        this.scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping  = true;
        this.controls.dampingFactor  = 0.05;
        this.controls.minDistance    = 3;
        this.controls.maxDistance    = 25;

        this.isInitialized = true;
        this.animate();
        window.addEventListener('resize', () => this._onResize(container));
    }

    _onResize(container) {
        if (!this.isInitialized) return;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls)  this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // ─── Step 3: CDN hash routing ─────────────────────────────────────────────
    // Each asset's hash encodes which of t0–t7 to use. NEVER use a single base.
    getCdnUrl(hash) {
        if (!hash) return '';
        let i = 31;
        for (let t = 0; t < hash.length; t++) i ^= hash.charCodeAt(t);
        return `https://t${i % 8}.rbxcdn.com/${hash}`;
    }

    // ─── Step 4 fix: disable transparency on every material ──────────────────
    // Roblox exports carry an alpha map that makes meshes render transparent/broken.
    _fixTransparency(object) {
        object.traverse(child => {
            if (!child.isMesh) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.transparent = false;
                mat.alphaTest   = 0;
                mat.needsUpdate = true;
            });
        });
    }

    // ─── Main load pipeline ───────────────────────────────────────────────────
    async loadAvatar(userId, onStatus = null) {
        if (!this.isInitialized) return false;
        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }

        try {
            // Step 1 — Fetch metadata. AssetService.getAvatarMetadata() tries:
            //   A) /api/roblox/thumbnail/3d  (internal worker, server-to-server)
            //   B) thumbnails.roproxy.com    (direct browser fetch, user's IP)
            // Retries up to 4× with 2.5 s delay to handle "Pending" state.
            const metaData = await AssetService.getAvatarMetadata(userId, onStatus);

            if (metaData.state !== 'Completed') {
                throw new Error(
                    `3D-Avatar nicht bereit (Status: ${metaData.state}). Bitte in einigen Sekunden erneut versuchen.`
                );
            }

            // Step 2 — Fetch scene JSON directly from rbxcdn.com (has CORS headers).
            const sceneResp = await fetch(metaData.imageUrl);
            if (!sceneResp.ok) throw new Error(`Scene-JSON Fehler: ${sceneResp.status}`);
            const sceneData = await sceneResp.json();

            // Store AABB so captureAngles can reference it
            this.aabb = sceneData.aabb ?? null;

            // Step 3 — Resolve per-asset CDN URLs
            const objUrl = this.getCdnUrl(sceneData.obj);
            const mtlUrl = this.getCdnUrl(sceneData.mtl);

            // Step 4 — LoadingManager with URL modifier.
            // The MTLLoader resolves texture paths relative to the MTL's base URL,
            // landing every texture on the MTL's CDN server → 404s for other servers.
            // The modifier intercepts every resolved URL and re-routes the hash to
            // its correct t0–t7 server via getCdnUrl().
            const manager = new THREE.LoadingManager();
            manager.setURLModifier((url) => {
                const match = url.match(/rbxcdn\.com\/([^?#/\s]+)/);
                if (match && match[1]) return this.getCdnUrl(match[1]);
                return url;
            });

            // Load MTL
            const mtlLoader = new THREE.MTLLoader(manager);
            mtlLoader.setCrossOrigin('anonymous');
            const materials = await new Promise((resolve, reject) => {
                mtlLoader.load(mtlUrl, resolve, undefined, reject);
            });
            materials.preload();

            // Disable transparency immediately after preload
            Object.values(materials.materials).forEach(mat => {
                mat.transparent = false;
                mat.alphaTest   = 0;
            });

            // Load OBJ with the corrected materials
            const objLoader = new THREE.OBJLoader(manager);
            objLoader.setMaterials(materials);
            this.model = await new Promise((resolve, reject) => {
                objLoader.load(objUrl, resolve, undefined, reject);
            });

            // Some materials get re-created during mesh assembly — fix again
            this._fixTransparency(this.model);

            // Center model: average Box3 bounds (mirrors AABB centering in the docs)
            const box    = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size   = box.getSize(new THREE.Vector3());
            this.model.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            this.model.scale.setScalar(6 / maxDim);

            this.scene.add(this.model);

            // Reset to front view
            this._setCameraFront();

            return true;
        } catch (err) {
            console.error('[AvatarRenderer] Loading Error:', err);
            return false;
        }
    }

    // ─── Camera helpers ───────────────────────────────────────────────────────

    _setCameraFront() {
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    // ─── Sidebar slider control ───────────────────────────────────────────────

    /**
     * Called by the ROT-X / ROT-Y sliders in the sidebar.
     * @param {number} xDeg  X-axis rotation in degrees (forward/back tilt)
     * @param {number} yDeg  Y-axis rotation in degrees (left/right spin)
     */
    setModelRotation(xDeg, yDeg) {
        if (!this.model) return;
        this.model.rotation.x = THREE.MathUtils.degToRad(xDeg);
        this.model.rotation.y = THREE.MathUtils.degToRad(yDeg);
    }

    /** Reset model rotation and camera to their default state. */
    resetOrientation() {
        if (this.model) this.model.rotation.set(0, 0, 0);
        this._setCameraFront();

        // Sync sliders back to zero
        const slX = document.getElementById('sl-rot-x');
        const slY = document.getElementById('sl-rot-y');
        if (slX) { slX.value = 0; document.getElementById('val-rot-x').textContent = '0°'; }
        if (slY) { slY.value = 0; document.getElementById('val-rot-y').textContent = '0°'; }
    }

    // ─── Portrait capture ─────────────────────────────────────────────────────
    /**
     * Portrait 2 → back view  (camera behind the avatar)
     * Portrait 3 → 45° right-side view  (front-right diagonal)
     */
    async captureAngles() {
        if (!this.model) return null;

        const originalPos = this.camera.position.clone();
        const dist        = 10;
        const angles      = {};

        // Back view
        this.camera.position.set(0, 0, -dist);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.back = this.renderer.domElement.toDataURL('image/png');

        // 45° right-side (front-right diagonal)
        const a = Math.PI / 4;
        this.camera.position.set(Math.sin(a) * dist, 0, Math.cos(a) * dist);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.side = this.renderer.domElement.toDataURL('image/png');

        // Restore
        this.camera.position.copy(originalPos);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        return angles;
    }
}

window.AvatarRenderer = AvatarRenderer;

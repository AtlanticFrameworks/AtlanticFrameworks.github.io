/**
 * AvatarRenderer.js
 * Three.js handler for Roblox 3D Avatars.
 *
 * Implements the strict workflow required by thumbnails.roblox.com:
 *   Step 1 → /api/roblox/thumbnail/3d (bwrpauth worker, authenticated via Roblox OAuth)
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
        this.modelPivot = null; // Group that holds model with 180° Y base rotation
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
    async loadAvatar(userId, onStatus = null, accessToken = null) {
        if (!this.isInitialized) return false;
        if (this.modelPivot) {
            this.scene.remove(this.modelPivot);
            this.model      = null;
            this.modelPivot = null;
        }

        try {
            // Step 1 — Fetch metadata via bwrpauth worker (OAuth-authenticated).
            // Retries up to 4× with 2.5 s delay to handle "Pending" state.
            const metaData = await AssetService.getAvatarMetadata(userId, onStatus, accessToken);

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

            // Center model and scale it to fit the view.
            // Scale must be applied first; the position offset is -s*center so that
            // the world-space bounding box center lands exactly at the origin.
            const box    = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size   = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const s      = 6 / maxDim;
            this.model.scale.setScalar(s);
            this.model.position.set(-center.x * s, -center.y * s, -center.z * s);

            // Roblox OBJ exports face -Z; wrap in a pivot rotated 180° on Y so the
            // avatar faces the camera (which is at +Z). Slider controls rotate the
            // inner model, leaving the base orientation intact.
            this.modelPivot = new THREE.Group();
            this.modelPivot.rotation.y = Math.PI;
            this.modelPivot.add(this.model);
            this.scene.add(this.modelPivot);

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
     * Rotates the inner model relative to the 180° base rotation in modelPivot,
     * so 0° always means "facing front" regardless of the base orientation.
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
     * Renders two portrait captures and returns them as data-URLs.
     * Portrait 2 → back view  (camera at -Z, looks at avatar's back)
     * Portrait 3 → right-front diagonal view
     *
     * Temporarily resizes the renderer to a portrait aspect ratio so the
     * captures fit the 170×230 side-image slots without excessive letterboxing.
     */
    async captureAngles() {
        if (!this.modelPivot) return null;

        // Compute world-space bounding box (after pivot rotation + scale)
        const box  = new THREE.Box3().setFromObject(this.modelPivot);
        const size = box.getSize(new THREE.Vector3());

        // Distance to frame the full body height with a 20% margin
        const vFovHalf = THREE.MathUtils.degToRad(45 / 2);
        const dist = (size.y / 2) / Math.tan(vFovHalf) * 1.2;

        // Temporarily render at portrait dimensions to match the side slots (170:230)
        const origSize = new THREE.Vector2();
        this.renderer.getSize(origSize);
        this.renderer.setSize(370, 500);
        this.camera.aspect = 370 / 500;
        this.camera.updateProjectionMatrix();

        const angles = {};

        // Back view — camera is on the -Z side, avatar faces +Z so camera sees the back
        this.camera.position.set(0, 0, -dist);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.back = this.renderer.domElement.toDataURL('image/png');

        // Right-front diagonal view
        const a = Math.PI / 4;
        this.camera.position.set(Math.sin(a) * dist, 0, Math.cos(a) * dist);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.side = this.renderer.domElement.toDataURL('image/png');

        // Restore renderer size and camera aspect, then return to front view
        this.renderer.setSize(origSize.x, origSize.y);
        this.camera.aspect = origSize.x / origSize.y;
        this.camera.updateProjectionMatrix();
        this._setCameraFront();

        return angles;
    }
}

window.AvatarRenderer = AvatarRenderer;

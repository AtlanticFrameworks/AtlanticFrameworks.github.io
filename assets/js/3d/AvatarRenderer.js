/**
 * AvatarRenderer.js
 * Specialized Three.js handler for Roblox 3D Avatars
 */
class AvatarRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.isInitialized = false;
        this.proxies = AssetService.proxies;
    }

    async fetchProxied(url, options) {
        return AssetService.fetchProxied(url, options);
    }

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 10);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;

        this.isInitialized = true;
        this.animate();
        window.addEventListener('resize', () => this.onWindowResize(container));
    }

    onWindowResize(container) {
        if (!this.isInitialized) return;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    async loadAvatar(userId) {
        if (!this.isInitialized) return;
        if (this.model) this.scene.remove(this.model);

        try {
            // 1. Fetch 3D Metadata
            const metaResp = await this.fetchProxied(`https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`);
            const metaData = await metaResp.json();
            if (!metaData.imageUrl) throw new Error("No 3D image URL");
            if (metaData.state !== "Completed") throw new Error("3D avatar not ready. Try again in a few seconds.");

            // 2. Fetch Scene JSON
            const sceneResp = await this.fetchProxied(metaData.imageUrl);
            const sceneData = await sceneResp.json();

            // 3. Load Assets
            const mtlLoader = new THREE.MTLLoader();
            const objLoader = new THREE.OBJLoader();
            
            // Set crossOrigin for texture loading
            mtlLoader.setCrossOrigin('anonymous');

            const mtl = await new Promise(async (resolve, reject) => {
                const url = sceneData.mtl;
                // Since MTLLoader.load doesn't natively support our async proxy list, 
                // we pre-fetch the blob if possible, or just use the first proxy
                const mtlUrl = AssetService.getProxiedUrl(url);
                mtlLoader.load(mtlUrl, resolve, undefined, reject);
            });
            mtl.preload();

            objLoader.setMaterials(mtl);
            this.model = await new Promise((resolve, reject) => {
                const url = sceneData.obj;
                const objUrl = AssetService.getProxiedUrl(url);
                objLoader.load(objUrl, resolve, undefined, reject);
            });

            // Center and Scale
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            this.model.position.sub(center);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 6 / maxDim; // Slightly larger fit
            this.model.scale.set(scale, scale, scale);

            this.scene.add(this.model);
            this.camera.position.set(0, 0, 10);
            this.controls.reset();
            return true;
        } catch (err) {
            console.error("Avatar Loading Error:", err);
            return false;
        }
    }

    async captureAngles() {
        if (!this.model) return null;
        const angles = {};
        const originalPos = this.camera.position.clone();

        // Back
        this.camera.position.set(0, 0, -10);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.back = this.renderer.domElement.toDataURL("image/png");

        // Side
        this.camera.position.set(10, 0, 0);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.side = this.renderer.domElement.toDataURL("image/png");

        // Restore
        this.camera.position.copy(originalPos);
        this.camera.lookAt(0, 0, 0);
        return angles;
    }
}

window.AvatarRenderer = AvatarRenderer;

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
    }

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Scene Setup
        this.scene = new THREE.Scene();
        
        // Camera Setup
        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 10);

        // Renderer Setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true // Required for toDataURL
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // Controls
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

        // Clear existing model
        if (this.model) {
            this.scene.remove(this.model);
        }

        try {
            const proxy = "https://api.allorigins.win/raw?url=";
            
            // 1. Fetch 3D Data URL from Roblox via Proxy
            const metaResp = await fetch(`${proxy}${encodeURIComponent(`https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`)}`);
            const metaData = await metaResp.json();
            
            if (!metaData.imageUrl) throw new Error("No 3D image URL found");

            // 2. Fetch the actual Scene JSON via Proxy
            const sceneResp = await fetch(`${proxy}${encodeURIComponent(metaData.imageUrl)}`);
            const sceneData = await sceneResp.json();

            // 3. Load MTL and OBJ
            const mtlLoader = new THREE.MTLLoader();
            const objLoader = new THREE.OBJLoader();

            // Roblox OBJ/MTL files are usually base64 or direct URLs in the JSON
            // For simplicity in this expert template, we assume standard URL loading
            // We'll need to set the texture path if provided
            mtlLoader.setResourcePath(''); 
            
            const mtl = await new Promise((resolve, reject) => {
                mtlLoader.load(`${proxy}${encodeURIComponent(sceneData.mtl)}`, resolve, undefined, reject);
            });
            mtl.preload();

            objLoader.setMaterials(mtl);
            this.model = await new Promise((resolve, reject) => {
                objLoader.load(`${proxy}${encodeURIComponent(sceneData.obj)}`, resolve, undefined, reject);
            });

            // Center and Scale Model
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            this.model.position.x += (this.model.position.x - center.x);
            this.model.position.y += (this.model.position.y - center.y);
            this.model.position.z += (this.model.position.z - center.z);
            
            // Auto-scale to fit
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            this.model.scale.set(scale, scale, scale);

            this.scene.add(this.model);
            
            // Reset Camera to Front
            this.camera.position.set(0, 0, 10);
            this.controls.reset();

            return true;
        } catch (err) {
            console.error("Failed to load Roblox Avatar:", err);
            return false;
        }
    }

    getSnapshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL("image/png");
    }

    async captureAngles() {
        if (!this.model) return null;

        const angles = {};

        // 1. Back View
        this.camera.position.set(0, 0, -10);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.back = this.renderer.domElement.toDataURL("image/png");

        // 2. Side View
        this.camera.position.set(10, 0, 0);
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        angles.side = this.renderer.domElement.toDataURL("image/png");

        // Reset to Front
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();

        return angles;
    }
}

window.AvatarRenderer = AvatarRenderer;

/**
 * AssetChooserService - Handles selecting and uploading assets/logos
 */
const AssetChooserService = {
    divLogos: [
        "ABC Abwehrtruppe.png", "Bundeswehr Verband.png", "Bundeswehr.png", 
        "Feldjäger.png", "KSK.png", "Karriere Center.png", "Logistiktruppe.png", 
        "MAD.png", "Marine.png", "Militärgericht.png", "Militärmusikkorps.png", 
        "Raider.png", "Sanitätsdienst.png", "UN.png", "Wachbataillon.png"
    ],
    
    activeTarget: null,

    init() {
        const grid = document.getElementById('asset-grid');
        if (grid) {
            grid.innerHTML = this.divLogos.map(name => `
                <div class="asset-card" onclick="AssetChooserService.selectAsset('${name}')">
                    <img src="assets/images/div_logos/${name}">
                    <span class="text-[8px] font-mono text-gray-500 uppercase">${name.replace('.png', '')}</span>
                </div>
            `).join('');
        }
        this.updateActiveAssetsList();
    },

    open(target) {
        this.activeTarget = target;
        ModalService.open('assets');
    },

    selectAsset(name) {
        const target = this.activeTarget;
        const img = document.getElementById('p-' + target);
        const zone = document.getElementById('zone-' + target);
        if (img) {
            img.src = 'assets/images/div_logos/' + name;
            img.classList.add('loaded');
            if (zone) zone.classList.add('has-img');
            ModalService.close('assets');
            this.updateActiveAssetsList();
            if (window.UIStateService) UIStateService.saveToStorage();
        }
    },

    triggerUpload(target) {
        this.activeTarget = target;
        const uploader = document.getElementById('global-uploader');
        if (uploader) uploader.click();
    },

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.applyImage(file, this.activeTarget);
        }
        e.target.value = '';
    },

    applyImage(file, target) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.getElementById('p-' + target);
            const zone = document.getElementById('zone-' + target);
            if (img) {
                img.src = ev.target.result;
                img.classList.add('loaded');
                if (zone) zone.classList.add('has-img');
                if (target === 'logo') ModalService.close('assets');
                this.updateActiveAssetsList();
                if (window.UIStateService) UIStateService.saveToStorage();
            }
        };
        reader.readAsDataURL(file);
    },

    updateImgTransform(target, type, val) {
        const state = UIStateService.state.imgStates[target];
        if (!state) return;

        if (type === 'scale') state.scale = parseFloat(val);
        if (type === 'x') state.x = parseInt(val);
        if (type === 'y') state.y = parseInt(val);
        
        const transformStr = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
        
        // Update 2D Image
        const img = document.getElementById('p-' + target);
        if (img) img.style.transform = transformStr;

        // Update 3D Canvas (If this is the main target)
        const canvas3d = document.getElementById('avatar-3d-canvas');
        if (target === 'main' && canvas3d) {
            canvas3d.style.transform = transformStr;
        }
        
        const label = document.getElementById(`val-${target}-${type}`);
        if (label) {
            label.textContent = type === 'scale' ? parseFloat(val).toFixed(2) + 'x' : val + 'px';
        }
        UIStateService.saveToStorage();
    },

    resetTransform(target) {
        const defaults = {
            main:     { scale: 1.93, x: -21, y: 153 },
            'side-1': { scale: 1.39, x: 6, y: -2 },
            'side-2': { scale: 1.55, x: 10, y: 60 },
            'side-3': { scale: 1.74, x: -2, y: 72 },
            logo:     { scale: 1.0, x: 0, y: 0 }
        };
        const d = defaults[target];
        if (!d) return;

        this.updateImgTransform(target, 'scale', d.scale);
        this.updateImgTransform(target, 'x', d.x);
        this.updateImgTransform(target, 'y', d.y);

        // Sync Sliders
        ['scale', 'x', 'y'].forEach(type => {
            const slider = document.querySelector(`input[oninput*="updateImgTransform('${target}', '${type}'"]`);
            if (slider) slider.value = d[type];
        });
    },

    adjustImg(target, type, delta) {
        const state = UIStateService.state.imgStates[target];
        if (type === 'scale') {
            state.scale = Math.max(0.1, state.scale + delta);
            this.updateImgTransform(target, 'scale', state.scale);
        }
    },

    removeImage(target) {
        const img = document.getElementById('p-' + target);
        const zone = document.getElementById('zone-' + target);
        if (img) {
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            img.classList.remove('loaded');
            if (zone) zone.classList.remove('has-img');
            
            if (target === 'main' && window.UIStateService) {
                UIStateService.toggle3D(false);
            }
            
            this.updateActiveAssetsList();
            if (window.UIStateService) UIStateService.saveToStorage();
        }
    },

    updateActiveAssetsList() {
        const list = document.getElementById('active-assets-list');
        if (!list) return;

        const targets = {
            'main': 'Hauptcharakter',
            'logo': 'Verbandslogo',
            'side-1': 'Portrait 1',
            'side-2': 'Portrait 2',
            'side-3': 'Portrait 3'
        };

        let html = '';
        Object.entries(targets).forEach(([id, label]) => {
            const zone = document.getElementById('zone-' + id);
            if (zone && zone.classList.contains('has-img')) {
                html += `
                    <div class="flex items-center justify-between bg-white/5 p-2 rounded border border-white/5 group hover:bg-white/10 transition-all">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 bg-bw-gold/10 rounded flex items-center justify-center">
                                <i data-lucide="image" class="w-3 h-3 text-bw-gold"></i>
                            </div>
                            <span class="text-[9px] font-mono text-gray-300 uppercase tracking-tighter">${label}</span>
                        </div>
                        <button onclick="AssetChooserService.removeImage('${id}')" class="text-gray-600 hover:text-red-500 transition-colors p-1">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                `;
            }
        });

        list.innerHTML = html || `<div class="text-[8px] text-gray-600 italic text-center py-4 border border-dashed border-white/5 rounded">Keine aktiven Bilder</div>`;
        if (window.lucide) lucide.createIcons();
    }
};

window.AssetChooserService = AssetChooserService;

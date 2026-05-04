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
        
        const img = document.getElementById('p-' + target);
        if (img) {
            img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
        }
        
        const label = document.getElementById(`val-${target}-${type}`);
        if (label) {
            label.textContent = type === 'scale' ? parseFloat(val).toFixed(2) + 'x' : val + 'px';
        }
        UIStateService.saveToStorage();
    },

    adjustImg(target, type, delta) {
        const state = UIStateService.state.imgStates[target];
        if (type === 'scale') {
            state.scale = Math.max(0.1, state.scale + delta);
            this.updateImgTransform(target, 'scale', state.scale);
        }
    }
};

window.AssetChooserService = AssetChooserService;

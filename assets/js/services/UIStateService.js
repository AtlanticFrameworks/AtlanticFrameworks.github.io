/**
 * UIStateService - Handles the state of the poster editor UI
 */
const UIStateService = {
    state: {
        currentZoom: 0.65,
        sidebarOpen: true,
        exportFormat: 'png',
        exportQuality: 1,
        imgStates: { 
            main: { scale: 1, x: 0, y: 0 }, 
            'side-1': { scale: 1, x: 0, y: 0 }, 
            'side-2': { scale: 1, x: 0, y: 0 }, 
            'side-3': { scale: 1, x: 0, y: 0 }, 
            logo: { scale: 1, x: 0, y: 0 } 
        }
    },

    init() {
        this.loadFromStorage();
        if (window.innerWidth < 768) {
            this.state.currentZoom = (window.innerWidth - 40) / 800;
            this.adjustZoom(0);
            this.toggleSidebar(false);
        }
    },

    toggle3D(show) {
        const canvas = document.getElementById('avatar-3d-canvas');
        const fallback = document.getElementById('p-main');
        if (!canvas || !fallback) return;
        
        if (show) {
            canvas.style.display = 'block';
            fallback.style.opacity = '0';
        } else {
            canvas.style.display = 'none';
            fallback.style.opacity = '1';
        }
    },

    toggleSidebar(force) {
        const sidebar = document.querySelector('aside');
        const icon = document.getElementById('sidebar-icon');
        const backdrop = document.getElementById('mobile-backdrop');
        if (!sidebar || !icon) return;

        this.state.sidebarOpen = force !== undefined ? force : !this.state.sidebarOpen;
        
        if (this.state.sidebarOpen) {
            sidebar.style.transform = 'translateX(0)';
            icon.setAttribute('data-lucide', 'settings-2');
            if (window.innerWidth < 768 && backdrop) backdrop.classList.remove('hidden');
        } else {
            sidebar.style.transform = 'translateX(-100%)';
            icon.setAttribute('data-lucide', 'chevron-right');
            if (window.innerWidth < 768 && backdrop) backdrop.classList.add('hidden');
        }
        if (window.lucide) lucide.createIcons();
    },

    adjustZoom(delta) {
        this.state.currentZoom = Math.min(Math.max(0.2, this.state.currentZoom + delta), 2);
        const scaler = document.getElementById('poster-scaler');
        const zoomLabel = document.getElementById('zoom-level');
        if (scaler) scaler.style.transform = `scale(${this.state.currentZoom})`;
        if (zoomLabel) zoomLabel.textContent = Math.round(this.state.currentZoom * 100) + '%';
        this.saveToStorage();
    },

    setLayout(layout) {
        const canvas = document.getElementById('poster-canvas');
        if (canvas) canvas.setAttribute('data-layout', layout);
        document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.getElementById('lay-' + layout);
        if (activeCard) activeCard.classList.add('active');
        this.saveToStorage();
    },

    syncColor(el, prop) {
        const canvas = document.getElementById('poster-canvas');
        if (canvas) canvas.style.setProperty('--' + prop, el.value);
        this.saveToStorage();
    },

    syncText(input, displayId) {
        const display = document.getElementById(displayId);
        if (display) display.textContent = input.value;
        this.saveToStorage();
    },

    updateFontSize(targetId, val) {
        const el = document.getElementById(targetId);
        if (el) el.style.fontSize = val + 'rem';
        const valLabel = document.getElementById('val-callsign-size');
        if (valLabel) valLabel.textContent = val + 'rem';
        this.saveToStorage();
    },

    updateEffects() {
        const grain = document.getElementById('ov-grain');
        const vignette = document.getElementById('ov-vignette');
        const scan = document.getElementById('ov-scan');
        
        if (grain) grain.style.display = document.getElementById('eff-grain').checked ? 'block' : 'none';
        if (vignette) vignette.style.display = document.getElementById('eff-vignette').checked ? 'block' : 'none';
        if (scan) scan.style.display = document.getElementById('eff-scan').checked ? 'block' : 'none';
        this.saveToStorage();
    },

    saveToStorage() {
        const state = {
            inputs: {
                rank: document.getElementById('in-rank')?.value || '',
                callsign: document.getElementById('in-callsign')?.value || '',
                callsign_size: document.querySelector('input[oninput*="updateFontSize("]')?.value || '14',
                watermark: document.getElementById('in-watermark')?.value || '',
                unit: document.getElementById('in-unit')?.value || '',
                specialty: document.getElementById('in-specialty')?.value || '',
                desc: document.getElementById('in-desc')?.value || ''
            },
            colors: {
                inner: document.getElementById('in-bg-inner')?.value || '',
                outer: document.getElementById('in-bg-outer')?.value || '',
                text: document.getElementById('in-text-main')?.value || '',
                accent: document.getElementById('in-accent')?.value || ''
            },
            effects: {
                grain: document.getElementById('eff-grain')?.checked || false,
                vignette: document.getElementById('eff-vignette')?.checked || false,
                scan: document.getElementById('eff-scan')?.checked || false
            },
            images: {
                main: document.getElementById('p-main')?.src || '',
                side1: document.getElementById('p-side-1')?.src || '',
                side2: document.getElementById('p-side-2')?.src || '',
                side3: document.getElementById('p-side-3')?.src || '',
                logo: document.getElementById('p-logo')?.src || ''
            },
            imgStates: this.state.imgStates,
            zoom: this.state.currentZoom,
            layout: document.getElementById('poster-canvas')?.getAttribute('data-layout') || 'vanguard'
        };
        try {
            localStorage.setItem('bwrp_poster_state', JSON.stringify(state));
        } catch (e) {
            console.warn("[UIStateService] Storage limit exceeded.");
        }
    },

    loadFromStorage() {
        const saved = localStorage.getItem('bwrp_poster_state');
        if (!saved) return;
        const state = JSON.parse(saved);

        // Load Inputs
        for (const [key, val] of Object.entries(state.inputs)) {
            const el = document.getElementById('in-' + key);
            if (el) {
                el.value = val;
                this.syncText(el, key === 'rank' ? 'p-rank' : key === 'callsign' ? 'p-callsign' : key === 'watermark' ? 'p-watermark' : key === 'unit' ? 'p-unit' : key === 'specialty' ? 'p-specialty' : 'p-desc');
            }
        }

        // Load Colors
        const colors = state.colors;
        if (document.getElementById('in-bg-inner')) {
            document.getElementById('in-bg-inner').value = colors.inner;
            document.getElementById('in-bg-outer').value = colors.outer;
            document.getElementById('in-text-main').value = colors.text;
            document.getElementById('in-accent').value = colors.accent;
            this.syncColor(document.getElementById('in-bg-inner'), 'bg-inner');
            this.syncColor(document.getElementById('in-bg-outer'), 'bg-outer');
            this.syncColor(document.getElementById('in-text-main'), 'text-main');
            this.syncColor(document.getElementById('in-accent'), 'accent-color');
        }

        // Load Effects
        if (document.getElementById('eff-grain')) {
            document.getElementById('eff-grain').checked = state.effects.grain;
            document.getElementById('eff-vignette').checked = state.effects.vignette;
            document.getElementById('eff-scan').checked = state.effects.scan;
            this.updateEffects();
        }

        // Load Images
        for (const [key, src] of Object.entries(state.images)) {
            const id = key === 'side1' ? 'p-side-1' : key === 'side2' ? 'p-side-2' : key === 'side3' ? 'p-side-3' : 'p-' + key;
            const img = document.getElementById(id);
            if (img && src && !src.includes('AQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')) {
                img.src = src;
                img.classList.add('loaded');
                const zone = document.getElementById('zone-' + (id.replace('p-', '')));
                if (zone) zone.classList.add('has-img');
            }
        }

        // Load Image Transforms
        Object.assign(this.state.imgStates, state.imgStates);
        this.refreshTransforms();

        // Load Layout
        if (state.layout) this.setLayout(state.layout);

        // Load Zoom
        this.state.currentZoom = state.zoom || 0.65;
        this.adjustZoom(0);

        // Load Font Sizes
        const callsignSize = state.inputs.callsign_size || "14";
        this.updateFontSize('p-callsign', callsignSize);
        const sizeSlider = document.querySelector('input[oninput*="updateFontSize("]');
        if (sizeSlider) sizeSlider.value = callsignSize;
    },

    refreshTransforms() {
        for (const target in this.state.imgStates) {
            const img = document.getElementById('p-' + target);
            if (img) {
                const s = this.state.imgStates[target];
                img.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.scale})`;
            }
            ['scale', 'x', 'y'].forEach(type => {
                const slider = document.querySelector(`input[oninput*="updateImgTransform('${target}', '${type}'"]`);
                if (slider) slider.value = this.state.imgStates[target][type];
                const label = document.getElementById(`val-${target}-${type}`);
                if (label) label.textContent = type === 'scale' ? parseFloat(this.state.imgStates[target][type]).toFixed(2) + 'x' : this.state.imgStates[target][type] + 'px';
            });
        }
    }
};

window.UIStateService = UIStateService;

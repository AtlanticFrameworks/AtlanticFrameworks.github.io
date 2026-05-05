/**
 * ExportService – Handles high-resolution poster export.
 *
 * Strategy: deep-clone the poster into an isolated off-screen fixed element
 * so html2canvas never sees the scaler transform, the preview container's
 * overflow clipping, or any live-DOM reflow. The live DOM is never touched.
 */
const ExportService = {

    async export(options) {
        const {
            format    = 'png',
            quality   = 2,
            btnId     = 'btn-do-export',
            onStart,
            onComplete,
        } = options;

        const btn      = document.getElementById(btnId);
        const posterEl = document.getElementById('poster-canvas');
        if (!posterEl) return;

        if (onStart) onStart();
        if (btn) { btn.disabled = true; btn.textContent = 'EXPORTING...'; }

        let wrapper = null;

        try {
            // ── 1. Read live dimensions and state ────────────────────────────────
            const exportWidth  = posterEl.offsetWidth;
            const exportHeight = posterEl.offsetHeight;

            // Snapshot the WebGL canvas NOW, before any DOM work
            let snapshot3D = null;
            const webglCanvas  = document.querySelector('#avatar-3d-canvas canvas');
            const container3D  = document.getElementById('avatar-3d-canvas');
            if (webglCanvas && container3D && container3D.style.display !== 'none') {
                snapshot3D = webglCanvas.toDataURL('image/png');
            }

            // ── 2. Read computed styles from the LIVE poster ─────────────────────
            const liveCS = getComputedStyle(posterEl);
            const cssVars = {
                '--bg-inner':     liveCS.getPropertyValue('--bg-inner').trim(),
                '--bg-outer':     liveCS.getPropertyValue('--bg-outer').trim(),
                '--accent-color': liveCS.getPropertyValue('--accent-color').trim(),
                '--text-main':    liveCS.getPropertyValue('--text-main').trim(),
                '--font-main':    liveCS.getPropertyValue('--font-main').trim() || 'Oswald',
                '--font-body':    liveCS.getPropertyValue('--font-body').trim() || 'Montserrat',
            };
            const resolvedBg = liveCS.background;

            // ── 3. Create an isolated off-screen container ───────────────────────
            wrapper = document.createElement('div');
            wrapper.style.cssText = [
                'position:fixed',
                'left:-9999px',
                'top:0',
                `width:${exportWidth}px`,
                `height:${exportHeight}px`,
                'overflow:hidden',
                'z-index:-9999',
                'pointer-events:none',
            ].join(';');

            // ── 4. Deep-clone the poster ─────────────────────────────────────────
            const clone = posterEl.cloneNode(true);

            clone.style.transform      = 'none';
            clone.style.width          = `${exportWidth}px`;
            clone.style.height         = `${exportHeight}px`;
            clone.style.position       = 'relative';
            clone.style.overflow       = 'hidden';
            clone.style.flexShrink     = '0';

            // Re-apply resolved CSS vars and the resolved background gradient
            Object.entries(cssVars).forEach(([k, v]) => { if (v) clone.style.setProperty(k, v); });
            clone.style.background = resolvedBg;

            // Preserve the data-layout attribute
            clone.setAttribute('data-layout', posterEl.getAttribute('data-layout') || 'vanguard');

            // ── 5. Strip contenteditable from every element in the clone ─────────
            clone.querySelectorAll('[contenteditable]').forEach(el => {
                el.removeAttribute('contenteditable');
            });

            // ── 6. Replace the WebGL canvas node ─────────────────────────────────
            const clone3D = clone.querySelector('#avatar-3d-canvas');
            if (clone3D) {
                clone3D.innerHTML = '';
                if (snapshot3D) {
                    clone3D.style.display = 'block';
                    const img3D = document.createElement('img');
                    img3D.src = snapshot3D;
                    img3D.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
                    clone3D.appendChild(img3D);
                } else {
                    clone3D.style.display = 'none';
                }
            }

            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // ── 7. Let the browser paint the clone ───────────────────────────────
            await new Promise(r => setTimeout(r, 200));

            // ── 8. Capture ───────────────────────────────────────────────────────
            const captured = await html2canvas(clone, {
                scale:           quality,
                useCORS:         true,
                allowTaint:      false,
                backgroundColor: null,
                logging:         false,
                width:           exportWidth,
                height:          exportHeight,
                scrollX:         0,
                scrollY:         0,
            });

            // ── 9. Download ──────────────────────────────────────────────────────
            const link = document.createElement('a');
            link.download = `BWRP_Poster_${Date.now()}.${format}`;
            link.href     = captured.toDataURL(`image/${format}`, 1.0);
            link.click();

        } catch (err) {
            console.error('[ExportService] Export failed:', err);
            alert('Export fehlgeschlagen. Bitte Konsole prüfen.');
        } finally {
            // Always clean up the off-screen wrapper
            if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);

            if (btn) { btn.disabled = false; btn.textContent = 'EXPORT STARTEN'; }
            if (onComplete) onComplete();
        }
    },
};

window.ExportService = ExportService;

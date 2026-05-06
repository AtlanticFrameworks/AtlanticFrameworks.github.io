/**
 * ExportService – Handles high-resolution poster export.
 *
 * Strategy: temporarily remove the poster-scaler CSS transform so html2canvas
 * sees the poster at its true 800×1200px layout size (avoiding the 0.65 scale
 * that would otherwise shrink the captured area). We use html2canvas's native
 * onclone callback — rather than a DIY off-screen clone — so that position
 * calculations for all child elements are correct. Two fixups are applied in
 * onclone: (1) replace the WebGL canvas with a static snapshot, and (2)
 * pre-render each loaded image onto a <canvas> with proper object-fit:contain
 * math, since html2canvas 1.4.1 does not implement that CSS property.
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
        const scaler   = document.getElementById('poster-scaler');
        if (!posterEl) return;

        if (onStart) onStart();
        if (btn) { btn.disabled = true; btn.textContent = 'EXPORTING...'; }

        // Save and remove the scaler transform so html2canvas sees posterEl at
        // its real layout dimensions (800×1200), not the 0.65-scaled visual size.
        const origTransform = scaler ? scaler.style.transform : null;
        if (scaler) scaler.style.transform = 'none';

        try {
            // ── 1. Read live dimensions ───────────────────────────────────────────
            // offsetWidth/offsetHeight are unaffected by CSS transforms on parents.
            const exportWidth  = posterEl.offsetWidth;
            const exportHeight = posterEl.offsetHeight;

            // ── 2. Snapshot the WebGL canvas NOW (before any DOM changes) ─────────
            let snapshot3D = null;
            const webglCanvas = document.querySelector('#avatar-3d-canvas canvas');
            const container3D = document.getElementById('avatar-3d-canvas');
            if (webglCanvas && container3D && container3D.style.display !== 'none') {
                // preserveDrawingBuffer:true in AvatarRenderer ensures this works
                snapshot3D = webglCanvas.toDataURL('image/png');
            }

            // ── 3. Wait for fonts and layout reflow ──────────────────────────────
            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 100)); // Brief pause for reflow

            // ── 4. Capture ────────────────────────────────────────────────────────
            const captured = await html2canvas(posterEl, {
                scale:           quality,
                useCORS:         true,
                allowTaint:      false,
                backgroundColor: null,
                logging:         false,
                width:           exportWidth,
                height:          exportHeight,
                scrollX:         0,
                scrollY:         0,

                onclone(clonedDoc, clonedEl) {
                    // ── (a) Replace WebGL canvas with the static snapshot ─────────
                    const clone3D = clonedEl.querySelector('#avatar-3d-canvas');
                    if (clone3D) {
                        clone3D.innerHTML = '';
                        if (snapshot3D) {
                            clone3D.style.display = 'block';
                            const img3D = clonedDoc.createElement('img');
                            img3D.src = snapshot3D;
                            img3D.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
                            clone3D.appendChild(img3D);
                        } else {
                            clone3D.style.display = 'none';
                        }
                    }

                    // ── (b) Fix object-fit:contain for images ─────────────────────
                    // html2canvas 1.4.1 ignores object-fit and stretches images to
                    // fill their element box. We pre-draw each loaded image onto a
                    // <canvas> using the correct contain-fit math so html2canvas
                    // captures already-correct pixels without needing object-fit.
                    const liveImages = posterEl.querySelectorAll('img.img-editable, img.character-img');
                    liveImages.forEach(liveImg => {
                        if (!liveImg.complete || !liveImg.naturalWidth) return;

                        const cloneImg = clonedEl.querySelector('#' + liveImg.id);
                        if (!cloneImg) return;

                        const wrapper = liveImg.closest('.side-image-wrapper, .bottom-logo-wrapper, .character-container');
                        if (!wrapper) return;

                        const cW = wrapper.offsetWidth;
                        const cH = wrapper.offsetHeight;

                        // Compute contain-fit scale and centering offsets
                        const s    = Math.min(cW / liveImg.naturalWidth, cH / liveImg.naturalHeight);
                        const rW   = liveImg.naturalWidth  * s;
                        const rH   = liveImg.naturalHeight * s;
                        const xOff = (cW - rW) / 2;
                        const yOff = (cH - rH) / 2;

                        // Draw image at correct size onto a canvas in the cloned document
                        const cvs = clonedDoc.createElement('canvas');
                        cvs.width  = cW;
                        cvs.height = cH;
                        cvs.getContext('2d').drawImage(liveImg, xOff, yOff, rW, rH);

                        // Copy styles and carry over any user transform (scale/translate from sliders)
                        cvs.className = liveImg.className;
                        cvs.style.cssText = `display:block;width:${cW}px;height:${cH}px;`;
                        if (liveImg.style.transform) cvs.style.transform = liveImg.style.transform;

                        cloneImg.replaceWith(cvs);
                    });

                    // Strip contenteditable from every element in the clone
                    clonedEl.querySelectorAll('[contenteditable]').forEach(el => {
                        el.removeAttribute('contenteditable');
                    });
                },
            });

            // ── 5. Download ───────────────────────────────────────────────────────
            const link = document.createElement('a');
            link.download = `BWRP_Poster_${Date.now()}.${format}`;
            link.href     = captured.toDataURL(`image/${format}`, 1.0);
            link.click();

        } catch (err) {
            console.error('[ExportService] Export failed:', err);
            alert('Export fehlgeschlagen. Bitte Konsole prüfen.');
        } finally {
            // Always restore the scaler transform
            if (scaler && origTransform !== null) scaler.style.transform = origTransform;

            if (btn) { btn.disabled = false; btn.textContent = 'EXPORT STARTEN'; }
            if (onComplete) onComplete();
        }
    },
};

window.ExportService = ExportService;

/**
 * ExportService – Handles high-resolution poster export.
 */
const ExportService = {

    async export(options) {
        const {
            format = 'png',
            quality = 2,
            btnId = 'btn-do-export',
            onStart,
            onComplete,
        } = options;

        const btn = document.getElementById(btnId);
        const posterEl = document.getElementById('poster-canvas');
        const scaler = document.getElementById('poster-scaler');
        if (!posterEl) return;

        if (onStart) onStart();
        if (btn) { btn.disabled = true; btn.textContent = 'EXPORTING...'; }

        // Save and remove the scaler transform so html2canvas sees posterEl at
        // its real layout dimensions (800x1200), not the 0.65-scaled visual size.
        const origTransform = scaler ? scaler.style.transform : null;
        if (scaler) scaler.style.transform = 'none';

        try {
            // ── 1. Read live dimensions ───────────────────────────────────────────
            const exportWidth = posterEl.offsetWidth;
            const exportHeight = posterEl.offsetHeight;

            // ── 2. Snapshot the WebGL canvas NOW (before any DOM changes) ─────────
            let snapshot3D = null;
            const webglCanvas = document.querySelector('#avatar-3d-canvas canvas');
            const container3D = document.getElementById('avatar-3d-canvas');
            if (webglCanvas && container3D && container3D.style.display !== 'none') {
                snapshot3D = webglCanvas.toDataURL('image/png');
            }

            // ── 3. Wait for fonts and layout reflow ──────────────────────────────
            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 100)); // Brief pause for reflow

            // ── 4. Capture ────────────────────────────────────────────────────────
            const captured = await html2canvas(posterEl, {
                scale: quality,
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                logging: false,
                width: exportWidth,
                height: exportHeight,
                scrollX: 0,
                scrollY: 0,

                onclone(clonedDoc, clonedEl) {
                    // ── (a) Replace WebGL canvas with background-image div ─────────
                    // Avoids <img> object-fit bugs in html2canvas.
                    const clone3D = clonedEl.querySelector('#avatar-3d-canvas');
                    if (clone3D) {
                        clone3D.innerHTML = '';
                        if (snapshot3D) {
                            clone3D.style.display = 'block';
                            const div3D = clonedDoc.createElement('div');
                            div3D.style.cssText = `width:100%;height:100%;background-image:url("${snapshot3D}");background-size:100% 100%;background-position:center;background-repeat:no-repeat;display:block;`;
                            clone3D.appendChild(div3D);
                        } else {
                            clone3D.style.display = 'none';
                        }
                    }

                    // ── (b) Fix object-fit & transform bugs for side images ─────────
                    // Instead of a manual <canvas> that clashes with CSS transforms, 
                    // we replace the images with styled <div> elements.
                    const liveImages = posterEl.querySelectorAll('img.img-editable, img.character-img');
                    liveImages.forEach(liveImg => {
                        if (!liveImg.complete || !liveImg.src) return;

                        const cloneImg = clonedEl.querySelector('#' + liveImg.id);
                        if (!cloneImg) return;

                        // Check if original image was using cover or contain
                        const computedStyle = window.getComputedStyle(liveImg);
                        const isCover = computedStyle.objectFit === 'cover' || computedStyle.objectFit === 'none';

                        const div = clonedDoc.createElement('div');
                        div.id = liveImg.id;
                        div.className = liveImg.className;

                        // Copy all inline styles (this correctly transfers pan/zoom transforms!)
                        div.style.cssText = liveImg.style.cssText;
                        div.style.width = computedStyle.width !== 'auto' ? computedStyle.width : '100%';
                        div.style.height = computedStyle.height !== 'auto' ? computedStyle.height : '100%';

                        // Delegate cropping logic entirely to background-image
                        div.style.backgroundImage = `url("${liveImg.src}")`;
                        div.style.backgroundSize = isCover ? 'cover' : 'contain';
                        div.style.backgroundPosition = computedStyle.objectPosition || 'center';
                        div.style.backgroundRepeat = 'no-repeat';

                        cloneImg.replaceWith(div);
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
            link.href = captured.toDataURL(`image/${format}`, 1.0);
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
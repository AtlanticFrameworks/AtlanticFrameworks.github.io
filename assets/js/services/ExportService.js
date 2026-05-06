/**
 * ExportService – Handles high-resolution poster export.
 * * Strategy (Pixel Baking): html2canvas fundamentally fails at rendering CSS transforms 
 * (pan/zoom) inside clipped wrappers (overflow: hidden). To bypass this completely,
 * we use Canvas 2D to "bake" the exact zoom, pan, and object-fit math into pure flat 
 * Data URLs *before* capturing. We then swap the live DOM with these flat images.
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

        // Remove the visual scale so the layout returns to true 800x1200
        const origTransform = scaler ? scaler.style.transform : null;
        if (scaler) scaler.style.transform = 'none';

        try {
            // ── 1. Wait for layout reflow ─────────────────────────────────────────
            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 150));

            const exportWidth = posterEl.offsetWidth;
            const exportHeight = posterEl.offsetHeight;

            // ── 2. BAKE THE 3D AVATAR ─────────────────────────────────────────────
            let baked3D = null;
            const container3D = document.getElementById('avatar-3d-canvas');
            const webglCanvas = container3D ? container3D.querySelector('canvas') : null;

            if (webglCanvas && container3D.style.display !== 'none') {
                const W = container3D.offsetWidth;
                const H = container3D.offsetHeight;
                const flatCvs = document.createElement('canvas');
                flatCvs.width = W; flatCvs.height = H;
                const ctx = flatCvs.getContext('2d');

                const tempImg = new Image();
                tempImg.src = webglCanvas.toDataURL('image/png');
                await new Promise(res => {
                    tempImg.onload = () => {
                        // Apply 'contain' math directly to the canvas pixels
                        const s = Math.min(W / tempImg.naturalWidth, H / tempImg.naturalHeight);
                        const rw = tempImg.naturalWidth * s;
                        const rh = tempImg.naturalHeight * s;
                        const rx = (W - rw) / 2;
                        const ry = (H - rh) / 2;
                        ctx.drawImage(tempImg, rx, ry, rw, rh);
                        baked3D = flatCvs.toDataURL('image/png');
                        res();
                    };
                });
            }

            // ── 3. BAKE THE 2D SIDE IMAGES (Fixes pan/zoom/crop) ──────────────────
            const bakedImages = new Map();
            const liveImages = posterEl.querySelectorAll('img.img-editable, img.character-img');

            for (const img of liveImages) {
                if (!img.complete || !img.naturalWidth) continue;

                const wrapper = img.parentElement;
                const W = wrapper.offsetWidth;
                const H = wrapper.offsetHeight;

                const flatCvs = document.createElement('canvas');
                flatCvs.width = W; flatCvs.height = H;
                const ctx = flatCvs.getContext('2d');

                const style = window.getComputedStyle(img);
                const objectFit = style.objectFit || 'fill';

                // Calculate cover/contain ratios
                let drawW = W, drawH = H, drawX = 0, drawY = 0;
                const imgRatio = img.naturalWidth / img.naturalHeight;
                const boxRatio = W / H;

                if (objectFit === 'cover') {
                    if (imgRatio > boxRatio) { drawH = H; drawW = H * imgRatio; }
                    else { drawW = W; drawH = W / imgRatio; }
                } else if (objectFit === 'contain') {
                    if (imgRatio < boxRatio) { drawH = H; drawW = H * imgRatio; }
                    else { drawW = W; drawH = W / imgRatio; }
                }
                drawX = (W - drawW) / 2;
                drawY = (H - drawH) / 2;

                ctx.save();
                // Extract CSS transform matrix and apply it directly to the brush
                const matrixStr = style.transform;
                if (matrixStr && matrixStr !== 'none') {
                    try {
                        const matrix = new DOMMatrix(matrixStr);
                        ctx.translate(W / 2, H / 2);
                        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
                        ctx.translate(-W / 2, -H / 2);
                    } catch (e) {
                        console.warn("Could not parse matrix:", matrixStr);
                    }
                }

                ctx.drawImage(img, drawX, drawY, drawW, drawH);
                ctx.restore();

                bakedImages.set(img.id, {
                    dataUrl: flatCvs.toDataURL('image/png'),
                    width: W,
                    height: H
                });
            }

            // ── 4. CAPTURE WITH HTML2CANVAS ───────────────────────────────────────
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
                    // Inject the flat 3D Avatar
                    const clone3DContainer = clonedEl.querySelector('#avatar-3d-canvas');
                    if (clone3DContainer) {
                        clone3DContainer.innerHTML = ''; // Clear everything
                        if (baked3D) {
                            clone3DContainer.style.display = 'block';
                            const flatImg = clonedDoc.createElement('img');
                            flatImg.src = baked3D;
                            // Reset ALL positioning styles so html2canvas can't misinterpret them
                            flatImg.style.cssText = 'width:100%;height:100%;object-fit:fill;display:block;margin:0;padding:0;border:none;transform:none;';
                            clone3DContainer.appendChild(flatImg);
                        } else {
                            clone3DContainer.style.display = 'none';
                        }
                    }

                    // Inject the flat 2D Images
                    for (const [imgId, baked] of bakedImages.entries()) {
                        const cloneImg = clonedEl.querySelector('#' + imgId);
                        if (cloneImg) {
                            const cloneWrapper = cloneImg.parentElement;
                            cloneWrapper.innerHTML = '';
                            const flatImg = clonedDoc.createElement('img');
                            flatImg.src = baked.dataUrl;
                            flatImg.style.cssText = `width:${baked.width}px;height:${baked.height}px;display:block;margin:0;padding:0;border:none;transform:none;object-fit:fill;`;
                            cloneWrapper.appendChild(flatImg);
                        }
                    }

                    // Remove blinking cursors
                    clonedEl.querySelectorAll('[contenteditable]').forEach(el => {
                        el.removeAttribute('contenteditable');
                    });
                },
            });

            // ── 5. DOWNLOAD ───────────────────────────────────────────────────────
            const link = document.createElement('a');
            link.download = `BWRP_Poster_${Date.now()}.${format}`;
            link.href = captured.toDataURL(`image/${format}`, 1.0);
            link.click();

        } catch (err) {
            console.error('[ExportService] Export failed:', err);
            alert('Export fehlgeschlagen. Bitte Konsole prüfen.');
        } finally {
            if (scaler && origTransform !== null) scaler.style.transform = origTransform;
            if (btn) { btn.disabled = false; btn.textContent = 'EXPORT STARTEN'; }
            if (onComplete) onComplete();
        }
    },
};

window.ExportService = ExportService;
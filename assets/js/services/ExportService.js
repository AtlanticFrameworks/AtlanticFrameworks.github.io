/**
 * ExportService - Handles high-resolution poster export
 */
const ExportService = {
    async export(options) {
        const {
            canvasId = 'poster-canvas',
            scalerId = 'poster-scaler',
            format = 'png',
            quality = 2,
            btnId = 'btn-do-export',
            onStart,
            onComplete
        } = options;

        const btn = document.getElementById(btnId);
        const canvasEl = document.getElementById(canvasId);
        const scaler = document.getElementById(scalerId);

        if (!canvasEl || !scaler) return;

        if (onStart) onStart();
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'EXPORTING...';
        }

        try {
            // 1. Capture 3D Snapshot if active
            let snapshot3D = null;
            const canvas3D = document.querySelector('#avatar-3d-canvas canvas');
            const container3D = document.getElementById('avatar-3d-canvas');
            
            if (canvas3D && container3D && container3D.style.display !== 'none') {
                snapshot3D = canvas3D.toDataURL("image/png");
            }

            // 2. Prepare live DOM for capture (Unscale to prevent text shifts)
            const originalTransform = scaler.style.transform;
            scaler.style.transform = 'none';
            
            const exportWidth = canvasEl.offsetWidth;
            const exportHeight = canvasEl.offsetHeight;

            const captureCanvas = await html2canvas(canvasEl, {
                scale: quality,
                useCORS: true,
                backgroundColor: null,
                logging: false,
                width: exportWidth,
                height: exportHeight,
                windowWidth: exportWidth,
                windowHeight: exportHeight,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    return new Promise((resolve) => {
                        const clonedCanvas = clonedDoc.getElementById(canvasId);
                        const clonedScaler = clonedDoc.getElementById(scalerId);
                        
                        clonedDoc.body.style.margin = '0';
                        clonedDoc.body.style.padding = '0';
                        
                        if (clonedScaler) {
                            clonedScaler.style.transform = 'none';
                            clonedScaler.style.margin = '0';
                            clonedScaler.style.width = exportWidth + 'px';
                            clonedScaler.style.height = exportHeight + 'px';
                        }
                        
                        clonedCanvas.style.transform = 'none';
                        clonedCanvas.style.position = 'relative';

                        // 3D Injection
                        if (snapshot3D) {
                            const cloned3DContainer = clonedDoc.getElementById('avatar-3d-canvas');
                            if (cloned3DContainer) {
                                cloned3DContainer.style.display = 'block';
                                cloned3DContainer.innerHTML = '';
                                const img3D = clonedDoc.createElement('img');
                                img3D.src = snapshot3D;
                                img3D.style.width = '100%';
                                img3D.style.height = '100%';
                                img3D.style.objectFit = 'contain';
                                img3D.onload = resolve; // Wait for decode
                                cloned3DContainer.appendChild(img3D);
                            } else {
                                resolve();
                            }
                        } else {
                            resolve();
                        }
                    });
                }
            });

            // 3. Restore Live DOM
            scaler.style.transform = originalTransform;

            // 4. Download
            const link = document.createElement('a');
            link.download = `BWRP_Poster_${Date.now()}.${format}`;
            link.href = captureCanvas.toDataURL(`image/${format}`, 1.0);
            link.click();

        } catch (err) {
            console.error('[ExportService] Export failed:', err);
            alert("Export fehlgeschlagen. Bitte Konsole prüfen.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'EXPORT STARTEN';
            }
            if (onComplete) onComplete();
        }
    }
};

window.ExportService = ExportService;

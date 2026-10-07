// --- Clock Update ---
        function updateClock() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('clock').textContent = timeString + ' UHR';
        }
        setInterval(updateClock, 1000);
        updateClock();

        // --- Terminal Logic ---
        const terminalOutput = document.getElementById('terminal-output');
        const inputLine = document.getElementById('input-line');
        const cmdInput = document.getElementById('cmd-input');
        const viewTerminal = document.getElementById('view-terminal');
        const viewSuccess = document.getElementById('view-success');

const bootSequence = [
            { text: "INITIALIZING KERNEL...", delay: 400 },
            { text: "LOADING ENCRYPTION MODULES...", delay: 800 },
            { text: "SECURE HANDSHAKE SUCCESSFUL.", delay: 600, color: "text-bwGreen" },
            { text: "WARNING: UNRECOGNIZED DEVICE DETECTED.", delay: 800, color: "text-bwYellow" },
            { text: "ERROR: SECURITY PROTOCOL ACTIVE. SYSTEM LOCKED.", delay: 1000, color: "text-bwRed glow-text-red font-bold" },
            { text: "PLEASE ENTER DNS OVERRIDE HASH:", delay: 400 }
        ];

        function addLine(text, colorClass = "text-gray-300") {
            const line = document.createElement('div');
            line.className = `${colorClass} mb-1 opacity-0 transition-opacity duration-300`;
            line.textContent = text;
            terminalOutput.appendChild(line);
            
            // Trigger reflow for animation
            void line.offsetWidth;
            line.classList.remove('opacity-0');
            
            // Auto scroll down
            viewTerminal.scrollTop = viewTerminal.scrollHeight;
        }

        async function runBootSequence() {
            for (let i = 0; i < bootSequence.length; i++) {
                const step = bootSequence[i];
                await new Promise(resolve => setTimeout(resolve, step.delay));
                addLine(step.text, step.color);
            }
            
            // Show input line after boot
            setTimeout(() => {
                inputLine.classList.remove('hidden-section');
                cmdInput.focus();
                viewTerminal.scrollTop = viewTerminal.scrollHeight;
            }, 500);
        }

        // Global click to focus input
        function focusInput() {
            if (!inputLine.classList.contains('hidden-section')) {
                cmdInput.focus();
            }
        }

        // The worker returns the embed URL only after server-side verification.
        let verifying = false;
        cmdInput.addEventListener('keydown', async function(e) {
            if (e.key !== 'Enter' || verifying) return;
            e.preventDefault();
            const key = this.value.trim();
            this.value = '';
            if (!key) return;
            verifying = true;
            addLine('> [AUTH KEY SUBMITTED]', 'text-bwYellow');
            inputLine.classList.add('hidden-section');
            try {
                const response = await fetch('/api/clearance/unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                    body: JSON.stringify({ key })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Zugriff verweigert.');
                const url = new URL(data.videoUrl);
                if (url.origin !== 'https://www.youtube-nocookie.com' || !/^\/embed\/[\w-]{11}$/.test(url.pathname)) {
                    throw new Error('Ungültige Videoantwort.');
                }
                const iframe = document.createElement('iframe');
                iframe.src = url.href;
                iframe.title = 'Offizieller Trailer';
                iframe.className = 'w-full h-full border-0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.referrerPolicy = 'strict-origin-when-cross-origin';
                iframe.allowFullscreen = true;
                document.getElementById('video-container').replaceChildren(iframe);
                addLine('ACCESS GRANTED.', 'text-bwGreen font-bold glow-text-green');
                addLine('DECRYPTING CLASSIFIED DATA...', 'text-bwGreen');
                setTimeout(triggerGlitchAndReveal, 1200);
            } catch (error) {
                addLine(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen.', 'text-bwRed font-bold glow-text-red');
                addLine('PLEASE ENTER DNS OVERRIDE HASH:');
                inputLine.classList.remove('hidden-section');
                cmdInput.focus();
            } finally {
                verifying = false;
            }
        });

        viewTerminal.addEventListener('click', focusInput);
        document.getElementById('disconnect-button').addEventListener('click', () => {
            document.getElementById('video-container').replaceChildren();
            location.reload();
        });

        // The Transition Effect
        function triggerGlitchAndReveal() {
            // Apply glitch to body
            document.body.classList.add('glitch-anim');
            
            // Flash screen white briefly
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw';
            flash.style.height = '100vh';
            flash.style.backgroundColor = 'white';
            flash.style.zIndex = '9999';
            flash.style.opacity = '0';
            flash.style.transition = 'opacity 0.2s ease-in-out';
            flash.style.pointerEvents = 'none';
            document.body.appendChild(flash);
            
            setTimeout(() => {
                flash.style.opacity = '1';
                
                setTimeout(() => {
                    // Remove glitch and hide terminal, show success
                    document.body.classList.remove('glitch-anim');
                    viewTerminal.classList.add('hidden-section');
                    viewSuccess.classList.remove('hidden-section');
                    
                    flash.style.opacity = '0';
                    setTimeout(() => flash.remove(), 200);
                }, 300);
            }, 300);
        }

        // Start everything on load
        window.addEventListener('DOMContentLoaded', () => {
            // Small initial delay before boot starts
            setTimeout(runBootSequence, 800);
        });

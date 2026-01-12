// --- 1. PARTICLE SYSTEM (Tactical Dust) ---
function initParticleSystem() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }
    initParticles();
    animateParticles();
}

// --- 2. 3D TILT EFFECT FOR CARDS ---
function initTiltEffect() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

// --- 3. PARALLAX HERO BACKGROUND ---
function initParallax() {
    const heroSection = document.getElementById('hero-section');
    const heroBg = document.getElementById('hero-bg');

    if (heroSection && heroBg) {
        heroSection.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth) * 20;
            const y = (e.clientY / window.innerHeight) * 20;
            heroBg.style.transform = `scale(1.1) translate(${-x}px, ${-y}px)`;
        });
    }
}

// --- 4. SCROLL REVEAL ANIMATION ---
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    function checkReveal() {
        const triggerBottom = window.innerHeight * 0.85;

        revealElements.forEach(el => {
            const boxTop = el.getBoundingClientRect().top;
            if (boxTop < triggerBottom) {
                el.classList.add('active');
            }
        });
    }
    window.addEventListener('scroll', checkReveal);
    checkReveal();
}

// --- 5. MODAL SYSTEM ---
const unitData = {
    'ksk': {
        title: 'Kommando Spezialkräfte',
        descI18n: 'units.ksk.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/818319745/Kommando-Spezialkr-fte',
        status: 'open'
    },
    'feldjaeger': {
        title: 'Feldjägertruppe',
        descI18n: 'units.feldjaeger.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/818377647/Milit-rpolizei',
        status: 'closed'
    },
    'marine': {
        title: 'Deutsche Marine',
        descI18n: 'units.marine.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/1099828835/Marine',
        status: 'open'
    },
    'sani': {
        title: 'Sanitätsdienst',
        descI18n: 'units.sani.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/821300954/Sanit-ter',
        status: 'open'
    },
    'raider': {
        title: 'Raider (OpFor)',
        descI18n: 'units.raider.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/821501078/Raider',
        status: 'open'
    },
    'abc': {
        title: 'ABC Abwehrtruppe',
        descI18n: 'units.abc.desc',
        access: 'rank_abc',
        gamepassUrl: 'https://www.roblox.com/game-pass/840860244/ABC-Truppe',
        status: 'open'
    },
    'wachbataillon': {
        title: 'Wachbataillon',
        descI18n: 'units.wachbataillon.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/818273729/Wachbataillon',
        status: 'open'
    },
    'un': {
        title: 'United Nations',
        descI18n: 'units.un.desc',
        access: 'gamepass',
        gamepassUrl: 'https://www.roblox.com/game-pass/1161655979/United-Nations',
        status: 'open'
    }
};

function openModal(unitKey) {
    const modal = document.getElementById('info-modal');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalAccess = document.querySelector('[data-i18n="modal.gamepass"]')?.nextElementSibling
        || document.querySelectorAll('.font-mono')[1]; // Fallback selector

    // FIX: Select the container by specific ID or robust class selector to avoid nesting issues
    let modalActionContainer = document.getElementById('modal-action-container');

    // Fallback if ID not found (for backward compatibility if HTML isn't updated yet, 
    // but we will update HTML next)
    if (!modalActionContainer) {
        // Try to find the right column div
        const rightCol = document.querySelector('#modal-content-wrapper .grid > div:last-child');
        if (rightCol) modalActionContainer = rightCol;
    }

    if (!modal) return;

    const data = unitData[unitKey];
    if (data) {
        // Set Title
        modalTitle.innerText = data.title;

        // Logic to update text based on current language
        const currentLang = localStorage.getItem('lang') || 'de';
        if (translations && translations[currentLang]) {
            modalDesc.innerText = translations[currentLang][data.descI18n];

            // UPDATE ACCESS TEXT
            const accessKey = data.access === 'rank_abc' ? 'modal.rank_abc' : 'modal.gamepass';
            if (modalAccess) modalAccess.innerText = translations[currentLang][accessKey];

        } else {
            modalDesc.innerText = "Loading...";
        }

        // UPDATE ACTION BUTTON & RIGHT COLUMN
        if (modalActionContainer) {
            let btnLabel = currentLang === 'de' ? 'Gamepass Kaufen' : 'Buy Gamepass';
            if (translations && translations[currentLang]) btnLabel = translations[currentLang]['modal.buy_gamepass'];

            let reqText = "Bestimmungen beachten!"; // Default fallback
            if (translations && translations[currentLang]) reqText = translations[currentLang]['modal.req'];


            // Completely reset the content of the action container to prevent duplication/nesting
            modalActionContainer.innerHTML = `
                <div class="bg-black/30 p-4 rounded border border-white/5 flex flex-col items-center justify-center text-center h-full">
                    <i data-lucide="shopping-cart" class="w-12 h-12 text-bw-gold mb-4"></i>
                    <p class="text-xs text-gray-500 mb-4" data-i18n="modal.req">${reqText}</p>
                    <div class="flex gap-2 w-full">
                        <a href="${data.gamepassUrl}" target="_blank" class="flex-1 bg-bw-gold hover:bg-white text-black px-4 py-3 text-sm font-bold uppercase transition-all flex items-center justify-center gap-2 tactical-notch">
                            <i data-lucide="external-link" class="w-4 h-4"></i> ${btnLabel}
                        </a>
                    </div>
                </div>
            `;

            // Re-bind Lucide icons
            lucide.createIcons();
        }

        // FEATURE: UPDATE STATUS INDICATOR
        // Stable selector for the stats container
        const statsContainer = document.querySelector('#modal-content-wrapper .grid > div:first-child .space-y-3');
        let statusRow = document.getElementById('status-row');

        if (statsContainer && !statusRow) {
            statusRow = document.createElement('div');
            statusRow.id = 'status-row';
            statusRow.className = 'flex justify-between text-xs border-b border-white/5 pb-2';
            const statusLabel = currentLang === 'de' ? 'Rekrutierungsstatus' : 'Recruitment Status';

            statusRow.innerHTML = `
                <span class="text-gray-500" data-i18n="modal.status">${statusLabel}</span>
                <span class="font-mono font-bold" id="status-value">OFFEN</span>
            `;
            statsContainer.appendChild(statusRow);
        }

        // Update Status Color/Text
        const statusValue = document.getElementById('status-value');
        if (statusValue) {
            const isClosed = data.status === 'closed';
            statusValue.className = `font-mono font-bold ${isClosed ? 'text-red-500' : 'text-green-500'}`;
            const statusKey = isClosed ? 'modal.status.closed' : 'modal.status.open';
            statusValue.innerText = translations && translations[currentLang] ? translations[currentLang][statusKey] : (isClosed ? 'CLOSED' : 'OPEN');
            statusValue.setAttribute('data-i18n', statusKey);
        }

        modal.classList.remove('hidden');
        setTimeout(() => modalBackdrop.classList.add('open'), 10);
    }
}

function closeModal() {
    const modal = document.getElementById('info-modal');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    if (!modal) return;

    modalBackdrop.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// --- DISCORD FETCH ---
async function fetchDiscordStats() {
    const guildId = '1117494848891650222';
    const countElement = document.getElementById('discord-count');
    if (!countElement) return;

    try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`);
        const data = await response.json();
        // Use translation for "Online"
        const currentLang = localStorage.getItem('lang') || 'de';
        const suffix = currentLang === 'de' ? ' EINGELOGGT' : ' ONLINE';
        countElement.innerText = (data.presence_count || "500+") + suffix;
    } catch (error) {
        countElement.innerText = "OFFLINE";
    }
}

// --- 6. STAFF LIST LOADER ---
// --- 6. STAFF LIST LOADER ---
async function fetchStaff() {
    const grid = document.getElementById('staff-grid');
    if (!grid) return;

    const groupId = '34246821'; // ATLANTIC Studios

    // Proxy Helper with Failover
    async function fetchProxy(targetUrl) {
        const proxies = [
            { url: 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(targetUrl), type: 'direct' },
            { url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl), type: 'json-wrapper' },
            { url: 'https://corsproxy.io/?' + encodeURIComponent(targetUrl), type: 'direct' }
        ];

        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const res = await fetch(proxy.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) continue;

                if (proxy.type === 'json-wrapper') {
                    const data = await res.json();
                    if (!data.contents) continue;
                    try { return JSON.parse(data.contents); } catch (e) { return data.contents; }
                } else {
                    return await res.json();
                }
            } catch (e) {
                console.warn(`Proxy fail: ${proxy.url}`, e);
                continue;
            }
        }
        throw new Error("All proxies failed.");
    }

    try {
        // 1. Get Roles
        const rolesData = await fetchProxy(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
        console.log("DEBUG: Available Group Roles:", rolesData.roles.map(r => r.name));

        // Define the roles we want to show and their display order
        const targetRoles = [
            "Group Owner",
            "Ownership Team",
            "Management",
            "Administrator",
            "Game Moderator"
        ];

        // Filter and sort roles based on our target list order
        const filteredRoles = rolesData.roles.filter(r => targetRoles.includes(r.name));

        // Sort specifically by the order in targetRoles array
        filteredRoles.sort((a, b) => targetRoles.indexOf(a.name) - targetRoles.indexOf(b.name));

        // 2. Fetch Members & Prepare Groups
        let staffGroups = {};
        let allUserIds = [];

        // Initialize empty arrays for targets to ensure order
        targetRoles.forEach(r => {
            if (r !== "Group Owner") staffGroups[r] = [];
        });
        if (!staffGroups["Ownership Team"]) staffGroups["Ownership Team"] = [];


        for (const role of filteredRoles) {
            let targetGroupName = role.name;
            let displayRoleName = role.name;

            if (role.name === "Group Owner") {
                targetGroupName = "Ownership Team";
                displayRoleName = "Ownership Team";
            }

            if (role.memberCount > 0) {
                const memData = await fetchProxy(`https://groups.roblox.com/v1/groups/${groupId}/roles/${role.id}/users?limit=25&sortOrder=Desc`);

                if (memData.data) {
                    memData.data.forEach(user => {
                        if (staffGroups[targetGroupName]) {
                            staffGroups[targetGroupName].push({
                                id: user.userId,
                                username: user.username,
                                displayName: user.displayName, // Use Display Name
                                role: displayRoleName
                            });
                            allUserIds.push(user.userId);
                        }
                    });
                }
            }
        }

        // 3. Clear Grid
        grid.innerHTML = '';
        if (allUserIds.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-500">Keine Staff-Mitglieder in den genannten Rängen gefunden.</div>';
            return;
        }

        // 4. Fetch Avatars (Batch)
        const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${allUserIds.join(',')}&size=150x150&format=Png&isCircular=false`;
        const avatarData = await fetchProxy(avatarUrl);

        // 5. Render Groups
        for (const roleName of targetRoles) {
            const groupMembers = staffGroups[roleName];
            if (!groupMembers || groupMembers.length === 0) continue;

            // Header for the Rank
            const header = document.createElement('div');
            header.className = "col-span-full border-b border-white/10 pb-2 mt-8 mb-4 flex items-center gap-4";
            header.innerHTML = `
                <h4 class="font-display text-2xl font-bold text-white uppercase tracking-wider">${roleName}</h4>
                <div class="h-px bg-bw-gold flex-1 opacity-30"></div>
            `;
            grid.appendChild(header);

            // Cards
            groupMembers.forEach(member => {
                const imgData = avatarData.data.find(img => img.targetId === member.id);
                const imageUrl = imgData ? imgData.imageUrl : 'assets/images/logo.png';

                const card = document.createElement('div');
                card.className = "bg-[#0a0a0a] border border-white/5 p-6 flex flex-col items-center hover:border-bw-gold/50 transition-colors group relative overflow-hidden";
                card.innerHTML = `
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div class="w-24 h-24 mb-4 relative">
                        <div class="absolute inset-0 bg-bw-gold/10 rounded-full blur-lg group-hover:bg-bw-gold/20 transition-colors"></div>
                        <img src="${imageUrl}" alt="${member.displayName}" class="w-full h-full object-cover rounded-full border-2 border-white/10 group-hover:border-bw-gold transition-colors relative z-10">
                    </div>
                    <h4 class="font-display font-bold text-white text-lg tracking-wide relative z-10 text-center leading-tight">${member.displayName}</h4>
                    <span class="text-[10px] text-gray-500 font-mono mt-1 relative z-10">@${member.username}</span>
                    <a href="https://www.roblox.com/users/${member.id}/profile" target="_blank" class="absolute inset-0 z-20"></a>
                `;
                grid.appendChild(card);
            });
        }

    } catch (error) {
        console.error("Staff fetch error:", error);
        grid.innerHTML = '<div class="col-span-full text-center text-red-500/50 text-xs font-mono">CONNECTION TO MAINFRAME FAILED. (API Error)</div>';
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initParticleSystem();
    initTiltEffect();
    initParallax();
    initScrollReveal();
    fetchDiscordStats();
    fetchStaff(); // Load staff

    // Mobile Menu Toggle (Delegation since header is loaded dynamically)
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#mobile-menu-btn')) {
            const menu = document.getElementById('mobile-menu');
            if (menu) menu.classList.toggle('hidden');
        }
    });
});

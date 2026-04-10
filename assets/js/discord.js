// assets/js/discord.js

const DISCORD_TEMPLATES = {
    wartung: {
        title:   '🔧 Wartungsarbeiten',
        message: 'Der Server wird für planmäßige Wartungsarbeiten kurzzeitig offline gehen.\n\nGeschätzte Downtime: **ca. 15–30 Minuten**\n\nWir informieren euch, sobald alles wieder läuft.',
        color:   '#e2a800',
        ping:    '@here',
    },
    update: {
        title:   '🚀 Update verfügbar',
        message: 'Ein neues Update wurde eingespielt!\n\n**Änderungen:**\n- Neue Features und Verbesserungen\n- Bugfixes\n- Performance-Optimierungen\n\nViel Spaß beim Spielen!',
        color:   '#10b981',
        ping:    '',
    },
    event: {
        title:   '🎉 Event-Ankündigung',
        message: 'Wir veranstalten ein **ingame Event**!\n\n**Wann:** Heute Abend\n**Wo:** Hauptserver\n**Preis:** Sonderauszeichnung für die Gewinner\n\nAlle sind herzlich eingeladen!',
        color:   '#a855f7',
        ping:    '@everyone',
    },
    staffmeeting: {
        title:   '📋 Staff-Meeting',
        message: 'Erinnerung: Das nächste Staff-Meeting findet statt!\n\n**Datum:** TBA\n**Uhrzeit:** TBA\n**Ort:** Discord Voice-Kanal\n\n**Anwesenheitspflicht für alle aktiven Mitarbeiter.**\nBei Verhinderung bitte vorher melden.',
        color:   '#5865F2',
        ping:    '@everyone',
    },
};

function applyTemplate(key) {
    const tpl = DISCORD_TEMPLATES[key];
    if (!tpl) return;
    const titleEl   = document.getElementById('dc-title');
    const msgEl     = document.getElementById('dc-message');
    const colorEl   = document.getElementById('dc-color');
    const pingEl    = document.getElementById('dc-ping');
    const presetEl  = document.getElementById('dc-color-preset');
    if (titleEl)  titleEl.value  = tpl.title;
    if (msgEl)    msgEl.value    = tpl.message;
    if (colorEl)  colorEl.value  = tpl.color;
    if (pingEl)   pingEl.value   = tpl.ping;
    updateDcCharCount();
    if (presetEl) {
        const match = [...presetEl.options].find(o => o.value === tpl.color);
        presetEl.value = match ? tpl.color : '';
    }
}

function applyDiscordColorPreset(hex) {
    if (!hex) return;
    const picker = document.getElementById('dc-color');
    if (picker) picker.value = hex;
}

function updateDcCharCount() {
    const msg   = document.getElementById('dc-message');
    const count = document.getElementById('dc-char-count');
    if (msg && count) count.textContent = msg.value.length;
}

function showDiscordStatusBar(state, text) {
    const bar = document.getElementById('discord-status-bar');
    if (!bar) return;

    const cfg = {
        loading: { border: 'border-tac-amber/40',  text: 'text-tac-amber', icon: 'loader-2',    spin: true  },
        success: { border: 'border-tac-green/40',  text: 'text-tac-green', icon: 'circle-check', spin: false },
        error:   { border: 'border-tac-red/40',    text: 'text-tac-red',   icon: 'circle-x',     spin: false },
    }[state] ?? { border: 'border-tac-border', text: 'text-zinc-400', icon: 'info', spin: false };

    bar.className = `mb-6 p-3 border font-mono text-xs flex items-center gap-3 ${cfg.border} ${cfg.text}`;
    bar.innerHTML = `<i data-lucide="${cfg.icon}" class="w-4 h-4 flex-shrink-0${cfg.spin ? ' animate-spin' : ''}"></i><span>${text}</span>`;
    bar.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [bar] });

    if (state === 'success') {
        setTimeout(() => bar.classList.add('hidden'), 5000);
    }
}

async function loadDiscordTab() {
    // Wire char counter once
    const msgEl = document.getElementById('dc-message');
    if (msgEl && !msgEl._discordWired) {
        msgEl.addEventListener('input', updateDcCharCount);
        msgEl._discordWired = true;
    }
    loadMaintenanceStatus();
}

async function loadMaintenanceStatus() {
    const badge = document.getElementById('maintenance-status-badge');
    const text  = document.getElementById('maintenance-toggle-text');
    const btn   = document.getElementById('maintenance-toggle-btn');
    if (!badge || !text || !btn) return;

    try {
        const data = await window.api.getStatus();
        const site = (data || []).find(s => s.service === 'Website');
        const isMaint = site?.status === 'MAINTENANCE';

        badge.textContent = isMaint ? 'WARTUNG' : 'ONLINE';
        badge.className = `px-2 py-0.5 border font-mono text-[10px] font-bold tracking-tighter ${isMaint ? 'border-tac-amber text-tac-amber bg-tac-amber/5' : 'border-tac-green text-tac-green bg-tac-green/5'}`;
        
        text.textContent = isMaint ? 'WARTUNG BEENDEN' : 'WARTUNGSMODUS STARTEN';
        btn.classList.toggle('border-tac-amber', isMaint);
        btn.classList.toggle('text-white', isMaint);
        btn.dataset.current = site?.status || 'ONLINE';
    } catch (e) {
        badge.textContent = 'FEHLER';
        badge.className = 'px-2 py-0.5 border border-tac-red text-tac-red bg-tac-red/5 font-mono text-[10px] font-bold tracking-tighter';
    }
}

async function toggleMaintenanceMode() {
    const btn  = document.getElementById('maintenance-toggle-btn');
    const curr = btn.dataset.current || 'ONLINE';
    const next = curr === 'MAINTENANCE' ? 'ONLINE' : 'MAINTENANCE';

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> VERARBEITE...';

    try {
        await window.api.post('/status/update', { service: 'Website', status: next });
        showToast(`Website-Status auf ${next} geändert.`, 'success');
        await loadMaintenanceStatus();
    } catch (e) {
        showToast('Fehler beim Ändern des Status: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    }
}

async function sendDiscordAnnouncement() {
    const title   = document.getElementById('dc-title')?.value?.trim()   ?? '';
    const message = document.getElementById('dc-message')?.value?.trim() ?? '';
    const color   = document.getElementById('dc-color')?.value            ?? '#5865F2';
    const ping    = document.getElementById('dc-ping')?.value             ?? '';

    if (!message) {
        showToast('Bitte Nachricht eingeben.', 'warn');
        return;
    }

    const btn = document.querySelector('[onclick="sendDiscordAnnouncement()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Senden...';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    }

    showDiscordStatusBar('loading', 'Sende Ankündigung...');

    try {
        await window.api.sendDiscordAnnouncement({ title, message, color, ping });
        showDiscordStatusBar('success', 'Ankündigung erfolgreich gesendet!');
        showToast('Ankündigung gesendet!', 'success');

        const lastTest      = document.getElementById('dc-last-test');
        const webhookStatus = document.getElementById('dc-webhook-status');
        if (lastTest)      lastTest.textContent = new Date().toLocaleTimeString('de-DE');
        if (webhookStatus) webhookStatus.innerHTML = '<span class="text-tac-green">ONLINE</span>';
    } catch (e) {
        const msg = e?.status === 503 ? 'Webhook nicht konfiguriert' : 'Senden fehlgeschlagen';
        showDiscordStatusBar('error', msg);
        showToast(msg, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> ANKÜNDIGUNG SENDEN';
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
        }
    }
}

async function testDiscordWebhook() {
    const webhookEl = document.getElementById('dc-webhook-status');
    const lastTest  = document.getElementById('dc-last-test');

    if (webhookEl) webhookEl.innerHTML = '<span class="text-tac-amber">TESTE...</span>';
    showDiscordStatusBar('loading', 'Teste Webhook-Verbindung...');

    try {
        await window.api.testDiscordWebhook();
        if (webhookEl) webhookEl.innerHTML = '<span class="text-tac-green">ONLINE</span>';
        if (lastTest)  lastTest.textContent = new Date().toLocaleTimeString('de-DE');
        showDiscordStatusBar('success', 'Webhook erreichbar — Verbindung aktiv.');
        showToast('Webhook erfolgreich getestet!', 'success');
    } catch (e) {
        if (webhookEl) webhookEl.innerHTML = '<span class="text-tac-red">FEHLER</span>';
        const msg = e?.status === 503 ? 'Webhook nicht konfiguriert' : 'Webhook nicht erreichbar';
        showDiscordStatusBar('error', msg);
        showToast(msg, 'error');
    }
}

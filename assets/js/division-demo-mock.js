/**
 * division-demo-mock.js — LOCAL PREVIEW ONLY, not part of the shipped feature.
 * Patches window.api's /divisions endpoints with in-memory fixture data so the
 * full picker → roster → manage flow can be clicked through offline, without the
 * bwrpauth worker deployed yet. Loaded after division.js on division-demo.html only.
 */
(function () {
    let nextId = 1000;

    const DB = {
        divisions: [
            { slug: 'ksk', name: 'KSK', color: '#E2B007', icon: 'crosshair', description: 'Eliteeinheit für spezielle Operationen.', sub_roles: [] },
            { slug: 'feldjaeger', name: 'Feldjäger', color: '#3b82f6', icon: 'shield-alert', description: 'Militärpolizei der Bundeswehr.', sub_roles: [] },
            { slug: 'marine', name: 'Marine', color: '#2563EB', icon: 'anchor', description: 'Operationen zu Wasser.', sub_roles: ['BEK', 'MSK', 'MiTa', 'KSM'] },
            { slug: 'sani', name: 'Sanitätsdienst', color: '#ef4444', icon: 'heart-pulse', description: 'Medizinische Versorgung.', sub_roles: [] },
            { slug: 'abc', name: 'ABC Abwehr', color: '#10b981', icon: 'biohazard', description: 'Schutz vor atomaren Bedrohungen.', sub_roles: [] },
            { slug: 'wachbataillon', name: 'Wachbataillon', color: '#eab308', icon: 'flag', description: 'Ehrengarde und Protokoll.', sub_roles: [] },
            { slug: 'un', name: 'United Nations', color: '#38bdf8', icon: 'globe', description: 'Internationale Friedenssicherung.', sub_roles: [] },
            { slug: 'mg', name: 'Militärgericht (MG)', color: '#7c3aed', icon: 'gavel', description: 'Militärische Gerichtsbarkeit und Disziplinarverfahren.', sub_roles: [] },
            { slug: 'mad', name: 'MAD (Militärischer Abschirmdienst)', color: '#0d9488', icon: 'eye', description: 'Aufklärung, Spionageabwehr und interne Sicherheit.', sub_roles: [] },
            { slug: 'ausbilder', name: 'Ausbilder', color: '#f97316', icon: 'graduation-cap', description: 'Ausbildung und Schulung neuer Rekruten.', sub_roles: [] },
        ],
        members: {
            marine: [
                { id: 1, roblox_id: '111111111', username: 'Kapitaen_Hoffmann', sub_role: 'BEK', joined_at: '2025-03-14' },
                { id: 2, roblox_id: '222222222', username: 'Matrose_Krueger', sub_role: 'BEK', joined_at: '2025-06-02' },
                { id: 3, roblox_id: null, username: 'Obermaat_Schulz', sub_role: 'MSK', joined_at: '2024-11-20' },
                { id: 4, roblox_id: null, username: 'Taucher_Lena', sub_role: 'MiTa', joined_at: '2025-01-09' },
                { id: 5, roblox_id: null, username: 'Kampfschwimmer_Voss', sub_role: 'KSM', joined_at: '2025-08-30' },
                { id: 6, roblox_id: null, username: 'Rekrut_Bauer', sub_role: '', joined_at: '2026-01-05' },
            ],
            ksk: [
                { id: 7, roblox_id: null, username: 'Oberfeldwebel_Wagner', sub_role: '', joined_at: '2024-05-11' },
                { id: 8, roblox_id: null, username: 'Stabsfeldwebel_Klein', sub_role: '', joined_at: '2025-09-17' },
            ],
        },
        strikes: {
            marine: [
                { id: 501, member_name: 'Rekrut_Bauer', count: 1, kind: 'temp', expires_at: '2026-10-15T18:00' },
                { id: 502, member_name: 'Matrose_Krueger', count: 3, kind: 'perm', expires_at: null },
            ],
        },
        signoffs: {
            marine: [
                { id: 701, roblox_id: '222222222', username: 'Matrose_Krueger', from_date: '2026-09-20', to_date: '2026-09-28', reason: 'Urlaub' },
            ],
        },
        leads: {
            marine: [{ roblox_id: '123456789', username: 'Kapitaen_Hoffmann', assigned_at: '2025-04-01' }],
        },
        subrolePermissions: {
            marine: { BEK: ['MANAGE_STRIKES'] },
        },
    };

    function clone(x) { return JSON.parse(JSON.stringify(x)); }
    function findDivision(slug) { return DB.divisions.find(d => d.slug === slug); }

    window.api.getDivisions = async () => ({ divisions: clone(DB.divisions) });

    window.api.getDivision = async (slug) => {
        const division = findDivision(slug);
        if (!division) throw new ApiError({ error: 'Division nicht gefunden' }, 404);
        return { division: clone(division), members: clone(DB.members[slug] || []) };
    };

    window.api.updateDivision = async (slug, data) => {
        const division = findDivision(slug);
        Object.assign(division, data);
        return { success: true };
    };

    const allSlugs = () => DB.divisions.map(d => d.slug);
    window.api.getMyDivisionLeads = async () => ({ isSystemAdmin: true, leadOf: allSlugs(), memberOf: allSlugs() });

    window.api.addDivisionMember = async (slug, data) => {
        const id = nextId++;
        (DB.members[slug] ||= []).push({ id, roblox_id: data.robloxId || null, username: data.username, sub_role: data.subRole || '', joined_at: data.joinedAt || null });
        return { success: true, id };
    };
    window.api.updateDivisionMember = async (slug, id, data) => {
        const m = (DB.members[slug] || []).find(x => x.id === id);
        if (m) Object.assign(m, { username: data.username ?? m.username, roblox_id: data.robloxId !== undefined ? (data.robloxId || null) : m.roblox_id, sub_role: data.subRole ?? m.sub_role, joined_at: data.joinedAt ?? m.joined_at });
        return { success: true };
    };
    window.api.removeDivisionMember = async (slug, id) => {
        DB.members[slug] = (DB.members[slug] || []).filter(x => x.id !== id);
        return { success: true };
    };

    window.api.getDivisionStrikes = async (slug) => ({ strikes: clone(DB.strikes[slug] || []) });
    window.api.addDivisionStrike = async (slug, data) => {
        const id = nextId++;
        (DB.strikes[slug] ||= []).push({ id, member_name: data.memberName, count: data.count, kind: data.kind, expires_at: data.expiresAt || null });
        return { success: true, id };
    };
    window.api.updateDivisionStrike = async (slug, id, data) => {
        const s = (DB.strikes[slug] || []).find(x => x.id === id);
        if (s) Object.assign(s, data);
        return { success: true };
    };
    window.api.removeDivisionStrike = async (slug, id) => {
        DB.strikes[slug] = (DB.strikes[slug] || []).filter(x => x.id !== id);
        return { success: true };
    };

    window.api.getDivisionSignoffs = async (slug) => ({ signoffs: clone(DB.signoffs[slug] || []) });
    window.api.addDivisionSignoff = async (slug, data) => {
        const id = nextId++;
        const user = window.__divisionDemoUser || { robloxId: 'demo', username: 'Demo' };
        (DB.signoffs[slug] ||= []).unshift({ id, roblox_id: user.robloxId, username: user.username, from_date: data.fromDate, to_date: data.toDate || null, reason: data.reason });
        return { success: true, id };
    };
    window.api.removeDivisionSignoff = async (slug, id) => {
        DB.signoffs[slug] = (DB.signoffs[slug] || []).filter(x => x.id !== id);
        return { success: true };
    };

    window.api.getDivisionSubrolePermissions = async (slug) => ({ permissions: clone(DB.subrolePermissions[slug] || {}) });
    window.api.updateDivisionSubrolePermissions = async (slug, subRole, permissions) => {
        const raw = decodeURIComponent(subRole);
        (DB.subrolePermissions[slug] ||= {})[raw] = permissions;
        return { success: true };
    };

    window.api.getDivisionLeads = async (slug) => ({ leads: clone(DB.leads[slug] || []) });
    window.api.assignDivisionLead = async (slug, identifier) => {
        const raw = decodeURIComponent(identifier);
        // Demo stand-in for the real backend's numeric-ID-or-username resolution.
        const isNumeric = /^\d+$/.test(raw);
        const robloxId = isNumeric ? raw : String(100000000 + (raw.length * 7919) % 900000000);
        const username = isNumeric ? null : raw;
        const list = (DB.leads[slug] ||= []);
        if (!list.some(l => l.roblox_id === robloxId)) list.push({ roblox_id: robloxId, username, assigned_at: new Date().toISOString().slice(0, 10) });
        return { success: true, username };
    };
    window.api.removeDivisionLead = async (slug, robloxId) => {
        DB.leads[slug] = (DB.leads[slug] || []).filter(l => l.roblox_id !== robloxId);
        return { success: true };
    };

    // Instantly "log in" as the hardcoded system admin (real backend checks the Roblox
    // username "thatzanex" specifically) instead of round-tripping through Roblox OAuth.
    const ADMIN_USER = { robloxId: 'demo-admin', username: 'thatzanex' };
    window.__divisionDemoUser = null;

    window.api.getDivisionMe = async () => {
        if (!window.__divisionDemoUser) throw new ApiError({ error: 'Nicht angemeldet' }, 401);
        return { user: window.__divisionDemoUser };
    };
    window.api.divisionLogout = async () => { window.__divisionDemoUser = null; };

    window.startRobloxOAuth = function () {
        window.__divisionDemoUser = ADMIN_USER;
        showToast('Demo-Login als thatzanex (Systemadministrator)', 'success', 2500);
        onDivisionLogin(ADMIN_USER);
    };
})();

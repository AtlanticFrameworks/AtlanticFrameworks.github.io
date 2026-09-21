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
        ],
        members: {
            marine: [
                { id: 1, username: 'Kapitaen_Hoffmann', sub_role: 'BEK', joined_at: '2025-03-14' },
                { id: 2, username: 'Matrose_Krueger', sub_role: 'BEK', joined_at: '2025-06-02' },
                { id: 3, username: 'Obermaat_Schulz', sub_role: 'MSK', joined_at: '2024-11-20' },
                { id: 4, username: 'Taucher_Lena', sub_role: 'MiTa', joined_at: '2025-01-09' },
                { id: 5, username: 'Kampfschwimmer_Voss', sub_role: 'KSM', joined_at: '2025-08-30' },
                { id: 6, username: 'Rekrut_Bauer', sub_role: '', joined_at: '2026-01-05' },
            ],
            ksk: [
                { id: 7, username: 'Oberfeldwebel_Wagner', sub_role: '', joined_at: '2024-05-11' },
                { id: 8, username: 'Stabsfeldwebel_Klein', sub_role: '', joined_at: '2025-09-17' },
            ],
        },
        strikes: {
            marine: [
                { id: 501, member_name: 'Rekrut_Bauer', count: 1, kind: 'temp', expires_at: '2026-10-15T18:00' },
                { id: 502, member_name: 'Matrose_Krueger', count: 3, kind: 'perm', expires_at: null },
            ],
        },
        leads: {
            marine: [{ roblox_id: '123456789', username: 'Kapitaen_Hoffmann', assigned_at: '2025-04-01' }],
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

    window.api.getMyDivisionLeads = async () => ({ isSystemAdmin: true, divisions: DB.divisions.map(d => d.slug) });

    window.api.addDivisionMember = async (slug, data) => {
        const id = nextId++;
        (DB.members[slug] ||= []).push({ id, username: data.username, sub_role: data.subRole || '', joined_at: data.joinedAt || null });
        return { success: true, id };
    };
    window.api.updateDivisionMember = async (slug, id, data) => {
        const m = (DB.members[slug] || []).find(x => x.id === id);
        if (m) Object.assign(m, { username: data.username ?? m.username, sub_role: data.subRole ?? m.sub_role, joined_at: data.joinedAt ?? m.joined_at });
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

    window.api.getDivisionLeads = async (slug) => ({ leads: clone(DB.leads[slug] || []) });
    window.api.assignDivisionLead = async (slug, robloxId) => {
        const list = (DB.leads[slug] ||= []);
        // Demo stand-in for the real backend's best-effort Roblox username lookup.
        if (!list.some(l => l.roblox_id === robloxId)) list.push({ roblox_id: robloxId, username: null, assigned_at: new Date().toISOString().slice(0, 10) });
        return { success: true };
    };
    window.api.removeDivisionLead = async (slug, robloxId) => {
        DB.leads[slug] = (DB.leads[slug] || []).filter(l => l.roblox_id !== robloxId);
        return { success: true };
    };

    // Instantly "log in" as the hardcoded system admin (real backend checks the Roblox
    // username "thatzanex" specifically) instead of round-tripping through Roblox OAuth.
    window.startRobloxOAuth = function () {
        showToast('Demo-Login als thatzanex (Systemadministrator)', 'success', 2500);
        enterDashboard('thatzanex', 'OWNER');
    };
})();

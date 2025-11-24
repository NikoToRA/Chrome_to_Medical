/**
 * Medicom-HRf / HOPE Series (Fujitsu Japan) Adapter (placeholder)
 */
class MedicomHopeAdapter extends EmrAdapter {
    constructor() {
        super('medicom_hope', 'Medicom-HRf/HOPE');
    }

    matches(url) {
        try {
            const host = new URL(url).hostname.toLowerCase();
            const list = (window.EMR_DOMAINS && window.EMR_DOMAINS.medicom_hope) || [];
            return list.some(d => d && host.includes(d.toLowerCase()));
        } catch (_) {
            return false;
        }
    }

    async pasteText(text) {
        // Use generic behavior for now
        return true;
    }

    async extractContext() {
        // TODO: implement DOM scraping when fields are known
        return {};
    }
}

if (typeof window !== 'undefined') {
    window.MedicomHopeAdapter = MedicomHopeAdapter;
}


/**
 * Medical Care Station (MCS) Adapter
 * URL: https://www.medical-care.net/
 */
class McsAdapter extends EmrAdapter {
    constructor() {
        super('mcs', 'Medical Care Station');
    }

    matches(url) {
        if (!url) return false;
        try {
            const u = new URL(url);
            const host = (u.hostname || '').toLowerCase();
            return host === 'medical-care.net' || host.endsWith('.medical-care.net');
        } catch (e) {
            // Fallback for non-standard URLs
            return String(url).toLowerCase().includes('medical-care.net');
        }
    }
}

if (typeof window !== 'undefined') {
    window.McsAdapter = McsAdapter;
}




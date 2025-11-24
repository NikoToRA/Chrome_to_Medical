/**
 * Brain Box (Yuyama) Adapter (placeholder)
 */
class BrainBoxAdapter extends EmrAdapter {
    constructor() {
        super('brainbox', 'Brain Box');
    }

    matches(url) {
        try {
            const host = new URL(url).hostname.toLowerCase();
            const list = (window.EMR_DOMAINS && window.EMR_DOMAINS.brainbox) || [];
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
        return {};
    }
}

if (typeof window !== 'undefined') {
    window.BrainBoxAdapter = BrainBoxAdapter;
}


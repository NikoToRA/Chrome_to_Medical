/**
 * Generic Adapter for unsupported sites
 */
class GenericAdapter extends EmrAdapter {
    constructor() {
        super('generic', 'Generic Web Page');
    }

    matches(url) {
        return true; // Fallback
    }

    async pasteText(text) {
        // Standard copy-paste or active element insertion
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.GenericAdapter = GenericAdapter;
}

/**
 * Adapter Manager
 * Handles registration and retrieval of EMR adapters.
 */
class EmrAdapterManager {
    constructor() {
        this.adapters = [];
        this.genericAdapter = new GenericAdapter();

        // Register known adapters
        // Note: These classes must be loaded before the manager
        if (window.M3DigikarAdapter) this.adapters.push(new M3DigikarAdapter());
        if (window.ClinicsAdapter) this.adapters.push(new ClinicsAdapter());
        if (window.MobacalAdapter) this.adapters.push(new MobacalAdapter());
        if (window.GmailAdapter) this.adapters.push(new GmailAdapter());
    }

    getAdapterForUrl(url) {
        return this.adapters.find(adapter => adapter.matches(url)) || this.genericAdapter;
    }

    getAllAdapters() {
        return [...this.adapters, this.genericAdapter];
    }
}

// Export for usage
if (typeof window !== 'undefined') {
    window.EmrAdapterManager = new EmrAdapterManager();
}

/**
 * Base Adapter Class for EMRs
 * All specific EMR adapters must extend this class.
 */
class EmrAdapter {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    /**
     * Check if the current URL matches this EMR
     * @param {string} url
     * @returns {boolean}
     */
    matches(url) {
        return false;
    }

    /**
     * Paste text into the EMR
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async pasteText(text) {
        console.log(`[${this.name}] Pasting text...`);
        return false;
    }

    /**
     * Paste image into the EMR
     * @param {Object} imageData
     * @returns {Promise<boolean>}
     */
    async pasteImage(imageData) {
        console.log(`[${this.name}] Pasting image...`);
        return false;
    }

    /**
     * Extract context data from the current EMR page (reserved for future use).
     * Should be executed in content-script context when implemented.
     * @returns {Promise<Object>} Context object (e.g., patient name, ID, department)
     */
    async extractContext() {
        return {};
    }
}

// Export for usage in other files (if using modules, but here we use global scope for extension)
if (typeof window !== 'undefined') {
    window.EmrAdapter = EmrAdapter;
}

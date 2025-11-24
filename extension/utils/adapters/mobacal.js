/**
 * Mobacal Adapter
 */
class MobacalAdapter extends EmrAdapter {
    constructor() {
        super('mobacal', 'Mobacal');
    }

    matches(url) {
        return url.includes('mobacal.net'); // Verify actual domain
    }

    async pasteText(text) {
        // TODO: Implement specific logic for Mobacal
        console.log(`[${this.name}] Logic to be implemented.`);
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.MobacalAdapter = MobacalAdapter;
}

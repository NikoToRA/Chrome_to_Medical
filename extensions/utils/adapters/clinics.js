/**
 * CLINICS Adapter
 */
class ClinicsAdapter extends EmrAdapter {
    constructor() {
        super('clinics', 'CLINICS');
    }

    matches(url) {
        return url.includes('clinics-karte.com') || url.includes('medley.jp') || url.includes('medley.life');
    }

    async pasteText(text) {
        // TODO: Implement specific logic for CLINICS
        console.log(`[${this.name}] Logic to be implemented.`);
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.ClinicsAdapter = ClinicsAdapter;
}

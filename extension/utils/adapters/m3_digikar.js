/**
 * m3 Digikar Adapter
 */
class M3DigikarAdapter extends EmrAdapter {
    constructor() {
        super('m3_digikar', 'm3 Digikar');
    }

    matches(url) {
        return url.includes('digikar.co.jp') || url.includes('karte.m3.com');
    }

    async pasteText(text) {
        // TODO: Implement specific logic for m3 Digikar
        console.log(`[${this.name}] Logic to be implemented.`);
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.M3DigikarAdapter = M3DigikarAdapter;
}

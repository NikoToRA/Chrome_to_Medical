/**
 * Gmail Adapter
 */
class GmailAdapter extends EmrAdapter {
    constructor() {
        super('gmail', 'Gmail');
    }

    matches(url) {
        return url.includes('mail.google.com');
    }

    async pasteText(text) {
        console.log(`[${this.name}] Pasting text...`);

        // Gmail usually uses a contenteditable div.
        // We rely on the user having the focus in the compose window, 
        // or we try to find the active element.

        // This logic will be executed in the context of the page (via content script injection usually, 
        // but currently our architecture seems to run this in the sidepanel context? 
        // WAIT. The adapter logic in `sidepanel.js` currently just logs or returns true/false.
        // The actual pasting happens in `handleTemplateClick` -> `chrome.runtime.sendMessage({ action: 'pasteToActiveTab' ... })`.
        // So the adapter here is primarily for *detection* and *display* in the sidepanel currently.
        // The `pasteText` method in the adapter class in `sidepanel.js` is not actually used for the pasting action yet 
        // because `handleTemplateClick` sends a message to `background.js` -> `content.js`.

        // HOWEVER, the user asked for "behavior is fine", implying the current generic paste might work, 
        // but they want it *recognized*.
        // So I just need to ensure it detects it.

        // If we want to support *specific* logic later, we would need to move this logic to the content script 
        // or have the content script use these adapters.
        // For now, I will implement the class as requested for recognition.

        return true;
    }
}

if (typeof window !== 'undefined') {
    window.GmailAdapter = GmailAdapter;
}

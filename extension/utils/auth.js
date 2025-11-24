// Auth Manager (Magic Link + Token)

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.isSubscribed = false;
        this.init();
    }

    async init() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await chrome.storage.local.get(['authToken', 'user']);
            if (result.authToken) {
                this.token = result.authToken;
                this.user = result.user;
                await this.checkSubscription();
            }
        }
    }

    async sendMagicLink(email) {
        try {
            await window.ApiClient.post('/auth-send-magic-link', { email });
            return true;
        } catch (e) {
            console.error("Failed to send magic link", e);
            throw e;
        }
    }

    async loginWithToken(token) {
        // Decode token to get user info (simple decode, no verify here, server verifies on requests)
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);

            this.user = { email: payload.email };
            this.token = token;

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ authToken: token, user: this.user });
            }

            await this.checkSubscription();
            return this.user;
        } catch (e) {
            console.error("Invalid token", e);
            throw new Error("Invalid token");
        }
    }

    async logout() {
        this.user = null;
        this.token = null;
        this.isSubscribed = false;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.remove(['authToken', 'user']);
        }
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    async checkSubscription() {
        if (!this.user || !this.user.email) return false;

        try {
            // Call Azure Function
            const response = await window.ApiClient.post('/check-subscription', { email: this.user.email });
            this.isSubscribed = response.active;
            return this.isSubscribed;
        } catch (e) {
            console.error("Subscription check failed", e);
            // Don't logout on check fail, just assume not subscribed or retry
            return false;
        }
    }

    async subscribe() {
        if (!this.user || !this.user.email) {
            alert("Please login first.");
            return;
        }

        try {
            const response = await window.ApiClient.post('/create-checkout-session', {
                email: this.user.email,
                returnUrl: window.location.href // Or a specific success page
            });

            if (response.url) {
                window.open(response.url, '_blank');
            }
        } catch (e) {
            console.error("Failed to start subscription", e);
            alert("Failed to start subscription flow.");
        }
    }
}

if (typeof window !== 'undefined') {
    window.AuthManager = new AuthManager();
}

// Auth Manager (Azure AD B2C + Subscription)

class AuthManager {
    constructor() {
        this.user = null;
        this.isSubscribed = false;
    }

    async login() {
        // TODO: Implement Azure AD B2C Login
        // For now, we simulate a login with an email
        const email = prompt("Enter your email for testing (mock login):", "test@example.com");
        if (!email) return null;

        this.user = { id: 'mock_' + email, name: email.split('@')[0], email: email };

        // Check subscription immediately after login
        await this.checkSubscription();

        return this.user;
    }

    async logout() {
        this.user = null;
        this.isSubscribed = false;
    }

    getUser() {
        return this.user;
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
                returnUrl: window.location.href
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

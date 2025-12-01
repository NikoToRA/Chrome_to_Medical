// Auth Manager (Azure AD B2C + Subscription)

class AuthManager {
    constructor() {
        this.user = null;
        this.isSubscribed = false;
        this.token = null;
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
        this.token = null;
        // ストレージからも削除
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.remove(['authToken', 'userEmail']);
        }
    }

    getUser() {
        return this.user;
    }

    // トークンを取得（ストレージから読み込み）
    async getToken() {
        if (this.token) {
            return this.token;
        }

        // ストレージからトークンを読み込み
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const result = await chrome.storage.local.get(['authToken']);
                if (result.authToken) {
                    this.token = result.authToken;
                    return this.token;
                }
            } catch (error) {
                console.error('[AuthManager] Token取得エラー:', error);
            }
        }

        return null;
    }

    // トークンを保存
    async setToken(token, email) {
        this.token = token;
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                await chrome.storage.local.set({
                    authToken: token,
                    userEmail: email
                });
            } catch (error) {
                console.error('[AuthManager] Token保存エラー:', error);
            }
        }
    }

    // 初期化時にストレージからトークンを読み込み
    async init() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const result = await chrome.storage.local.get(['authToken', 'userEmail']);
                if (result.authToken) {
                    this.token = result.authToken;
                }
                if (result.userEmail) {
                    this.user = { email: result.userEmail };
                    await this.checkSubscription();
                }
            } catch (error) {
                console.error('[AuthManager] 初期化エラー:', error);
            }
        }
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
    // 初期化時にトークンを読み込み
    window.AuthManager.init().catch(console.error);
}

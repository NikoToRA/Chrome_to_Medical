// Auth Manager (Magic Link + Token)

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.isSubscribed = false;
        this.initialized = false;
        this.initPromise = null;
        // サブスクリプション詳細情報
        this.trialEnd = null;
        this.periodEnd = null;
        this.subscriptionStatus = null;
        this.trialDaysRemaining = null;
        this.init();
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                console.log('[AuthManager] 初期化開始');
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    const result = await chrome.storage.local.get(['authToken', 'user']);
                    if (result.authToken) {
                        console.log('[AuthManager] 保存されたトークンを検出');
                        this.token = result.authToken;
                        this.user = result.user;
                        
                        // トークンの有効性を検証
                        try {
                            await this.verifyTokenWithServer(result.authToken);
                            await this.checkSubscription();
                            console.log('[AuthManager] トークン検証成功');
                        } catch (verifyError) {
                            console.warn('[AuthManager] トークン検証失敗:', verifyError);
                            // 無効なトークンは削除
                            await this.logout();
                        }
                    } else {
                        console.log('[AuthManager] 保存されたトークンなし');
                    }
                }
                this.initialized = true;
                console.log('[AuthManager] 初期化完了');
            } catch (error) {
                console.error('[AuthManager] 初期化エラー:', error);
                this.initialized = true; // エラーでも初期化完了として扱う
                throw error;
            }
        })();

        return this.initPromise;
    }

    async ensureInitialized() {
        if (!this.initialized && this.initPromise) {
            await this.initPromise;
        }
        return this.initialized;
    }

    async verifyTokenWithServer(token) {
        if (!token) {
            throw new Error('Token is required');
        }

        try {
            // サーバー側でトークンを検証
            // 注意: check-subscriptionエンドポイントを使用しているが、
            // このエンドポイントはサブスクリプション状態を返すためのものであり、
            // トークン検証専用ではない
            // 401が返ってきた場合、トークンが無効なのか、サブスクリプションが無効なのかを
            // 区別できない可能性があるため、レスポンスが返ってきたらトークンは有効と判断
            const response = await window.ApiClient.post('/check-subscription', { 
                email: this.user?.email || 'verify-only' 
            }, { retries: 0, timeout: 10000 });
            
            // レスポンスが返ってきたらトークンは有効
            // サブスクリプション状態に関わらず、200が返ってきたらトークンは有効
            return true;
        } catch (error) {
            console.error('[AuthManager] トークン検証エラー:', error);
            // check-subscriptionエンドポイントが401を返す場合、
            // トークンが無効なのか、サブスクリプションが無効なのかを区別できない
            // そのため、401エラーでもトークンが無効とは限らない
            // ただし、他のエラー（500など）の場合は一時的な問題の可能性があるので、
            // トークンは保持するが、エラーをスローする
            // 401の場合、トークンの有効性を確認できないため、エラーをスローしない
            // （サブスクリプションが無効なだけかもしれない）
            if (error.status === 401 || error.message?.includes('401')) {
                // 401が返ってきた場合、トークンが無効かもしれないが、
                // サブスクリプションが無効なだけの可能性もある
                // ここでは、トークンが有効であると仮定する（サブスクリプション確認時に処理）
                console.warn('[AuthManager] 401エラーが発生しましたが、サブスクリプション状態の可能性もあるため、トークン検証をスキップします');
                return true; // トークンが有効であると仮定
            }
            // その他のエラーは一時的な問題の可能性があるので、トークンは保持
            throw error;
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
        if (!token || typeof token !== 'string') {
            throw new Error('トークンが無効です');
        }

        try {
            console.log('[AuthManager] トークンでログイン開始');
            
            // トークンの形式を検証（JWT形式: xxx.yyy.zzz）
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('トークンの形式が無効です');
            }

            // Decode token to get user info (simple decode, no verify here, server verifies on requests)
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);

            if (!payload.email) {
                throw new Error('トークンにメールアドレスが含まれていません');
            }

            this.user = { email: payload.email };
            this.token = token;

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ authToken: token, user: this.user });
                console.log('[AuthManager] トークンをストレージに保存');
            }

            // サーバー側でトークンを検証
            try {
                await this.verifyTokenWithServer(token);
                await this.checkSubscription();
                console.log('[AuthManager] ログイン成功:', payload.email);
                return this.user;
            } catch (verifyError) {
                console.error('[AuthManager] サーバー検証エラー:', verifyError);
                // 検証失敗時はログアウト
                await this.logout();
                throw new Error('トークンの検証に失敗しました: ' + (verifyError.message || '不明なエラー'));
            }
        } catch (e) {
            console.error('[AuthManager] ログインエラー:', e);
            if (e.message) {
                throw e;
            }
            throw new Error('トークンの処理に失敗しました: ' + (e.message || '不明なエラー'));
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

    isAuthenticated() {
        return !!(this.user && this.token);
    }

    async refreshAuth() {
        console.log('[AuthManager] 認証状態を再確認');
        if (!this.token) {
            return false;
        }

        try {
            await this.verifyTokenWithServer(this.token);
            const isSubscribed = await this.checkSubscription();

            // サブスクリプション無効時の自動ログアウトチェック
            // サーバー側（check-subscription）でStripeのtrialEndベースで判定済み
            const didLogout = await this.checkSubscriptionExpiration();

            if (didLogout) {
                return false; // ログアウトした場合はfalseを返す
            }

            return isSubscribed;
        } catch (error) {
            console.error('[AuthManager] 認証状態の再確認に失敗:', error);
            // verifyTokenWithServerとcheckSubscriptionで401エラーが返ってきても
            // トークンが無効とは限らない（サブスクリプション状態の可能性もある）
            // そのため、ログアウトは行わない
            // トークンが無効な場合は、次回のAPI呼び出し時にエラーが発生する
            return false;
        }
    }

    /**
     * サブスクリプション状態をチェックし、無効な場合は自動ログアウト
     * サーバー側（check-subscription）でStripeのtrialEndベースで判定済み
     */
    async checkSubscriptionExpiration() {
        // サーバー側でactive判定されていない場合は、自動ログアウト
        if (!this.isSubscribed) {
            console.warn('[AuthManager] サブスクリプションが無効です。自動ログアウトします。');

            // ログアウト理由を判定
            let reason = 'サブスクリプションが無効です。';
            if (this.subscriptionStatus === 'trialing' && this.trialEnd) {
                const trialEndDate = new Date(this.trialEnd);
                const now = new Date();
                if (now > trialEndDate) {
                    reason = 'トライアル期間が終了しました。サブスクリプションを開始してください。';
                }
            } else if (this.subscriptionStatus === 'canceled') {
                reason = 'サブスクリプションがキャンセルされました。';
            }

            // ログアウト前に通知
            if (typeof showNotification === 'function') {
                showNotification(reason, 'warning');
            }

            // 自動ログアウト
            await this.logout();
            return true; // ログアウトしたことを返す
        }
        return false; // ログアウトしていない
    }

    async checkSubscription() {
        if (!this.user || !this.user.email) {
            console.warn('[AuthManager] ユーザー情報がないため、サブスクリプション確認をスキップ');
            return false;
        }

        if (!this.token) {
            console.warn('[AuthManager] トークンがないため、サブスクリプション確認をスキップ');
            return false;
        }

        try {
            console.log('[AuthManager] サブスクリプション確認開始:', this.user.email);
            // Call Azure Function
            const response = await window.ApiClient.post('/check-subscription', { email: this.user.email }, {
                retries: 1,
                timeout: 10000
            });
            
            this.isSubscribed = response.active === true;
            
            // サブスクリプションの詳細情報を保存（trialEnd, periodEnd等）
            if (response.trialEnd) {
                this.trialEnd = new Date(response.trialEnd);
            }
            if (response.periodEnd) {
                this.periodEnd = new Date(response.periodEnd);
            }
            if (response.status) {
                this.subscriptionStatus = response.status;
            }
            if (response.trialDaysRemaining !== undefined) {
                this.trialDaysRemaining = response.trialDaysRemaining;
            }
            
            console.log('[AuthManager] サブスクリプション状態:', this.isSubscribed ? '有効' : '無効');
            if (this.trialEnd) {
                console.log('[AuthManager] トライアル終了日:', this.trialEnd.toISOString());
            }
            if (this.periodEnd) {
                console.log('[AuthManager] サブスクリプション期間終了日:', this.periodEnd.toISOString());
            }
            
            return this.isSubscribed;
        } catch (e) {
            console.error('[AuthManager] サブスクリプション確認失敗:', e);
            // 401エラーの場合は認証エラーとして扱う
            // ただし、サブスクリプション確認エンドポイントは認証エラーではなく、
            // サブスクリプション状態を返すべきなので、401が返ってきた場合は
            // トークンの有効性を別途確認する必要がある
            // ここでは、401が返ってきてもログアウトせず、サブスクリプションが無効とみなす
            if (e.status === 401 || e.message?.includes('401') || e.message?.includes('Unauthorized')) {
                console.warn('[AuthManager] 401エラーが発生しましたが、サブスクリプション確認エンドポイントでは認証エラーとして扱わず、サブスクリプション無効として処理します');
                // トークンの有効性を確認するために、別のエンドポイントを呼び出すか、
                // ここではサブスクリプション無効として扱う
                this.isSubscribed = false;
                return false;
            }
            // Don't logout on check fail, just assume not subscribed or retry
            this.isSubscribed = false;
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

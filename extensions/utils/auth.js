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
        // v0.2.5: サブスク無効時の理由（ログアウトせずUIで表示用）
        this.subscriptionInactiveReason = null;
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
                        // v0.2.5: 検証失敗時もログアウトしない（一時的なネットワークエラーを考慮）
                        try {
                            await this.verifyTokenWithServer(result.authToken);
                            await this.checkSubscription();
                            console.log('[AuthManager] トークン検証成功');
                        } catch (verifyError) {
                            console.warn('[AuthManager] トークン検証失敗（ログアウトはしません）:', verifyError);
                            // v0.2.5: 一時的なエラーでログアウトしない
                            // トークンは保持し、次回のAPI呼び出しで再検証
                            // 明確にトークンが無効（JWT形式エラー等）な場合のみログアウト
                            if (verifyError.message && verifyError.message.includes('トークンの形式が無効')) {
                                console.warn('[AuthManager] トークン形式が無効のためログアウト');
                                await this.logout();
                            }
                            // それ以外（ネットワークエラー、サーバーエラー等）はトークンを保持
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
                // v0.2.52: ログイン時は必ず最新のサブスク状態を取得（再課金後すぐ使えるように）
                await this.checkSubscription(true); // forceRefresh = true
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
     * サブスクリプション状態をチェックし、無効な場合は通知のみ（ログアウトしない）
     * v0.2.5: 自動ログアウトを廃止。サブスク無効でもトークンを保持し、UIでブロックする方針に変更。
     * 理由: 一時的なサーバーエラーやStripe Webhook遅延で誤ってログアウトされる問題を防止
     */
    async checkSubscriptionExpiration() {
        if (!this.isSubscribed) {
            console.warn('[AuthManager] サブスクリプションが無効です（ログアウトはしません）');

            // ログアウトせずに理由を記録するのみ
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

            // 理由をプロパティに保存（UIで表示用）
            this.subscriptionInactiveReason = reason;

            // 注意: ログアウトは行わない。トークンを保持し、UIでブロックする
            // 自動ログアウトは一時的なエラーでユーザー体験を損なうため廃止
            return false; // ログアウトしていない（サブスク無効を示すためfalseを返す）
        }
        this.subscriptionInactiveReason = null;
        return false; // ログアウトしていない
    }

    /**
     * サブスクリプション状態を確認（キャッシュベース）
     * v0.2.52: 1日1回のみAPIコール、それ以外はキャッシュを使用
     * @param {boolean} forceRefresh - trueならキャッシュを無視してAPIコール
     * @returns {Promise<boolean>}
     */
    async checkSubscription(forceRefresh = false) {
        if (!this.user || !this.user.email) {
            console.warn('[AuthManager] ユーザー情報がないため、サブスクリプション確認をスキップ');
            return false;
        }

        if (!this.token) {
            console.warn('[AuthManager] トークンがないため、サブスクリプション確認をスキップ');
            return false;
        }

        // v0.2.52: キャッシュを確認（forceRefreshでない場合）
        if (!forceRefresh && typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const cached = await this._getSubscriptionCache();
                if (cached && cached.checkedAt) {
                    const hoursSinceCheck = (Date.now() - new Date(cached.checkedAt).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceCheck < 24) {
                        console.log('[AuthManager] キャッシュを使用（最終チェック:', cached.checkedAt, '）');
                        this._applySubscriptionData(cached);
                        return this.isSubscribed;
                    }
                }
            } catch (cacheError) {
                console.warn('[AuthManager] キャッシュ読み込みエラー:', cacheError);
            }
        }

        // APIコールでサブスクリプション確認
        return this._fetchSubscriptionFromServer();
    }

    /**
     * サーバーからサブスクリプション状態を取得（強制）
     * background.jsの定期チェックから呼ばれる
     */
    async forceCheckSubscription() {
        return this.checkSubscription(true);
    }

    /**
     * サーバーからサブスクリプション状態を取得
     * @private
     */
    async _fetchSubscriptionFromServer() {
        try {
            console.log('[AuthManager] サブスクリプション確認開始（API）:', this.user.email);
            const response = await window.ApiClient.post('/check-subscription', { email: this.user.email }, {
                retries: 1,
                timeout: 10000
            });

            // レスポンスを適用
            this._applySubscriptionData(response);

            // v0.2.52: キャッシュに保存
            await this._saveSubscriptionCache(response);

            console.log('[AuthManager] サブスクリプション状態:', this.isSubscribed ? '有効' : '無効');
            if (this.trialEnd) {
                console.log('[AuthManager] トライアル終了日:', this.trialEnd.toISOString());
            }

            return this.isSubscribed;
        } catch (e) {
            console.error('[AuthManager] サブスクリプション確認失敗:', e);
            if (e.status === 401 || e.message?.includes('401') || e.message?.includes('Unauthorized')) {
                console.warn('[AuthManager] 401エラー、サブスクリプション無効として処理');
                this.isSubscribed = false;
                return false;
            }
            // エラー時はキャッシュがあればそれを使用、なければfalse
            const cached = await this._getSubscriptionCache();
            if (cached) {
                console.log('[AuthManager] API失敗、キャッシュを使用');
                this._applySubscriptionData(cached);
                return this.isSubscribed;
            }
            this.isSubscribed = false;
            return false;
        }
    }

    /**
     * サブスクリプションデータをプロパティに適用
     * @private
     */
    _applySubscriptionData(data) {
        this.isSubscribed = data.active === true;
        this.hasSubscriptionRecord = data.hasSubscriptionRecord || false;

        if (data.trialEnd) {
            this.trialEnd = new Date(data.trialEnd);
        }
        if (data.periodEnd || data.expiry) {
            this.periodEnd = new Date(data.periodEnd || data.expiry);
        }
        if (data.status) {
            this.subscriptionStatus = data.status;
        }
        if (data.trialDaysRemaining !== undefined) {
            this.trialDaysRemaining = data.trialDaysRemaining;
        }
    }

    /**
     * サブスクリプションキャッシュを保存
     * @private
     */
    async _saveSubscriptionCache(data) {
        if (typeof chrome === 'undefined' || !chrome.storage) return;

        const cacheData = {
            ...data,
            checkedAt: new Date().toISOString()
        };

        await chrome.storage.local.set({
            subscriptionCache: cacheData,
            lastSubscriptionCheck: cacheData.checkedAt
        });
        console.log('[AuthManager] サブスクリプションキャッシュを保存');
    }

    /**
     * サブスクリプションキャッシュを取得
     * @private
     */
    async _getSubscriptionCache() {
        if (typeof chrome === 'undefined' || !chrome.storage) return null;

        return new Promise((resolve) => {
            chrome.storage.local.get(['subscriptionCache'], (result) => {
                resolve(result.subscriptionCache || null);
            });
        });
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

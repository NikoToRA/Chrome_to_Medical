// API Client for Azure Functions

// v0.2.6+: APIMへ一本化（フェイルバックでFunction直叩きもサポート）
const API_BASE_URL = 'https://apim-karte-ai-1763705952.azure-api.net/api';
const FALLBACK_BASE_URL = 'https://func-karte-ai-1763705952.azurewebsites.net/api';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async post(endpoint, data, options = {}) {
        const { timeout = 180000, retries = 1 } = options; // Default 180s timeout, 1 retry
        const primaryUrl = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Auth Token if available
        if (typeof window !== 'undefined' && window.AuthManager) {
            try {
                const token = await window.AuthManager.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.warn('[ApiClient] Token取得エラー:', error);
                // トークンが取得できなくてもリクエストは続行
            }
        }

        const doFetch = async (url) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
                clearTimeout(id);

                if (!response.ok) {
                    let errorMessage = `API Error: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.error) {
                            errorMessage += ` - ${errorData.error}`;
                        } else if (errorData && errorData.message) {
                            errorMessage += ` - ${errorData.message}`;
                        }
                    } catch (e) {
                        // ignore JSON parse error, use status text
                        if (response.statusText) {
                            errorMessage += ` (${response.statusText})`;
                        }
                    }

                    // Handle specific HTTP errors
                    if (response.status === 429) {
                        // Rate Limiting (APIM)
                        const retryAfter = response.headers.get('Retry-After') || '60';
                        throw new Error(`APIリクエスト制限中です。${retryAfter}秒後に再試行してください。`);
                    }
                    if (response.status === 504 || response.status === 503) {
                        throw new Error(`Server Busy (Status: ${response.status})`);
                    }
                    throw new Error(errorMessage);
                }

                // Parse JSON response with error handling
                const text = await response.text();
                if (!text || text.trim() === '') {
                    console.warn('[ApiClient] Empty response body');
                    // Return a sentinel so caller can handle gracefully
                    return { error: 'EMPTY_RESPONSE' };
                }

                try {
                    return JSON.parse(text);
                } catch (jsonError) {
                    console.error('[ApiClient] JSON parse error:', jsonError);
                    console.error('[ApiClient] Response text:', text.substring(0, 200));
                    throw new Error(`Invalid JSON response from server: ${jsonError.message}`);
                }
            } catch (error) {
                clearTimeout(id);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeout}ms`);
                }
                throw error;
            }
        };

        try {
            // Try APIM first
            try {
                return await doFetch(primaryUrl);
            } catch (e) {
                // Network/CORS/5xx fallback to direct Function URL
                const shouldFallback = (
                    e.message?.includes('Failed to fetch') || // CORS/Network
                    e.message?.includes('NetworkError') ||
                    e.message?.includes('Server Busy') ||
                    /API Error: (5\d\d)/.test(e.message || '')
                );
                if (shouldFallback) {
                    const fallbackUrl = `${FALLBACK_BASE_URL}${endpoint}`;
                    console.warn('[ApiClient] APIM失敗のためフェイルバック実行:', e.message);
                    return await doFetch(fallbackUrl);
                }
                throw e;
            }
        } catch (error) {
            if (retries > 0) {
                console.log(`API Request failed, retrying... (${retries} attempts left)`);
                // Simple backoff for cold starts
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.post(endpoint, data, { ...options, retries: retries - 1 });
            }
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async chat(messages, system) {
        return this.post('/chat', { messages, system });
    }



    async saveLog(type, metadata, userId = null) {
        // Get actual user ID from AuthManager if not provided
        if (!userId && typeof window !== 'undefined' && window.AuthManager) {
            const user = window.AuthManager.getUser();
            if (user) {
                userId = user.id || user.email || null;
            }
        }

        // Fire and forget for logs? Or wait?
        // Usually better to not block UI.
        this.post('/save-log', { userId: userId || 'anonymous', type, content: metadata, metadata }).catch(console.error);
    }

    async logInsertion(payload) {
        // Get actual user ID from AuthManager if not provided in payload
        let userId = payload.userId;
        if (!userId && typeof window !== 'undefined' && window.AuthManager) {
            const user = window.AuthManager.getUser();
            if (user) {
                userId = user.id || user.email || null;
            }
        }

        // Map payload to save-log format
        const saveData = {
            userId: userId || 'anonymous',
            type: payload.action || 'insertion_log',
            content: payload.content || '',
            metadata: payload.metadata || payload || {}
        };

        // Fire and forget for logs - log-insertion (404) -> save-log
        this.post('/save-log', saveData).catch(console.error);
    }

    async cancelSubscription(email) {
        return this.post('/cancel-subscription', { email });
    }

    async checkSubscription(email) {
        return this.post('/check-subscription', { email });
    }

    async saveSettings(userId, settings) {
        return this.post('/save-settings', { userId, settings });
    }

    async getSettings(userId) {
        return this.post('/get-settings', { userId });
    }
}

// Create global instance
const apiClient = new ApiClient();

// Make it available globally
if (typeof window !== 'undefined') {
    window.ApiClient = apiClient;
}

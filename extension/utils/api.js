// API Client for Azure Functions

// ローカルでの動作確認用に一時的にlocalhostに変更
const API_BASE_URL = 'http://localhost:7071/api';
// const API_BASE_URL = 'https://func-karte-ai-1763705952.azurewebsites.net/api';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async post(endpoint, data, options = {}) {
        const { timeout = 60000, retries = 1 } = options; // Default 60s timeout, 1 retry
        const url = `${this.baseUrl}${endpoint}`;
        
        // Log request for debugging
        console.log(`[ApiClient] POST ${endpoint}`, { url, timeout, retries });

        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Auth Token if available
        try {
            if (window.AuthManager) {
                const token = window.AuthManager.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } else if (chrome && chrome.storage && chrome.storage.local) {
                 // Fallback for when AuthManager is not yet initialized (rare)
                 // This needs to be async, but post is async, so we can't easily wait here without refactoring
                 // relying on AuthManager is better.
            }
        } catch (e) {
            console.warn('[ApiClient] Failed to attach token', e);
        }

        const executeFetch = async (attempt) => {
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

                // Always try to read the response body first (can only be read once)
                let responseBody;
                let responseText = null;
                
                try {
                    // Clone response to avoid "body already read" error
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        responseBody = await response.json();
                    } else {
                        responseText = await response.text();
                        try {
                            responseBody = JSON.parse(responseText);
                        } catch (parseError) {
                            console.error('[ApiClient] Response is not JSON:', responseText);
                            throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
                        }
                    }
                } catch (jsonError) {
                    // If JSON parsing fails completely
                    console.error('[ApiClient] Failed to parse response:', jsonError);
                    if (!response.ok) {
                        throw new Error(`API Error ${response.status}: ${jsonError.message}`);
                    }
                    throw jsonError;
                }

                // Check for offline error in response body (even if status is 200)
                if (responseBody && responseBody.type === 'offline') {
                    console.error('[ApiClient] Offline error detected in response:', {
                        endpoint: endpoint,
                        status: response.status,
                        responseBody: responseBody,
                        url: url
                    });
                    const error = new Error(`Azure Functions is offline or unavailable. SessionId: ${responseBody.sessionId || 'unknown'}`);
                    error.responseBody = responseBody;
                    error.endpoint = endpoint;
                    throw error;
                }

                if (!response.ok) {
                    // Handle HTTP errors
                    let errorMessage = `API Error: ${response.status}`;
                    let errorDetails = null;
                    
                    console.error('[ApiClient] HTTP Error response:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: responseBody
                    });
                    
                    if (responseBody && responseBody.error) {
                        errorMessage = responseBody.error;
                    }
                    if (responseBody && responseBody.details) {
                        errorDetails = responseBody.details;
                        errorMessage += `: ${errorDetails}`;
                    } else if (responseBody && responseBody.message) {
                        errorDetails = responseBody.message;
                        errorMessage += `: ${errorDetails}`;
                    }
                    
                    // Handle specific HTTP errors
                    if (response.status === 504 || response.status === 503) {
                        throw new Error(`Server Busy (Status: ${response.status})`);
                    }
                    
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.details = errorDetails;
                    error.responseBody = responseBody;
                    throw error;
                }

                return responseBody;
            } catch (error) {
                clearTimeout(id);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeout}ms`);
                }
                // Check if it's a network error (offline)
                if (error.message && error.message.includes('Failed to fetch')) {
                    console.error('[ApiClient] Network error (possibly offline):', error);
                    throw new Error(`Network error: Azure Functionsへの接続に失敗しました。インターネット接続を確認してください。`);
                }
                throw error;
            }
        };

        try {
            return await executeFetch(0);
        } catch (error) {
            // Check if it's a network error (offline/failed to fetch)
            const isNetworkError = error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('Network error') ||
                error.message.includes('Network request failed') ||
                error.name === 'TypeError' // fetch failures often throw TypeError
            );
            
            if (isNetworkError && retries > 0) {
                const backoffDelay = 2000 * (retries + 1); // Exponential backoff: 4s, 6s
                console.log(`[ApiClient] Network error detected, retrying after ${backoffDelay}ms... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this.post(endpoint, data, { ...options, retries: retries - 1 });
            } else if (retries > 0 && !isNetworkError) {
                // For non-network errors, use shorter backoff (cold start)
                console.log(`[ApiClient] Request failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.post(endpoint, data, { ...options, retries: retries - 1 });
            }
            
            console.error('[ApiClient] Request Failed:', {
                endpoint,
                error: error.message,
                isNetworkError,
                retries
            });
            throw error;
        }
    }

    async chat(messages, system) {
        // Increase retries for chat endpoint (cold start対策)
        return this.post('/chat', { messages, system }, { retries: 2, timeout: 120000 }); // 2 retries, 120s timeout
    }

    async saveLog(type, metadata, userId) {
        try {
            return await this.post('/save-log', { userId, type, content: metadata, metadata });
        } catch (error) {
            console.error('Failed to save log', error);
            return null;
        }
    }

    async logInsertion(entry) {
        if (!entry || !entry.content) {
            throw new Error('logInsertion requires content');
        }

        try {
            return await this.post('/log-insertion', entry, { retries: 0, timeout: 10000 }); // 10秒タイムアウト
        } catch (error) {
            // log-insertionの失敗は非致命的なので、エラーをログに記録するだけ
            console.warn('[ApiClient] Failed to log insertion (non-fatal):', error.message || error);
            return null; // エラーを返さない（呼び出し元の処理を継続させる）
        }
    }
}

// Create global instance
const apiClient = new ApiClient();

// Make it available globally
if (typeof window !== 'undefined') {
    window.ApiClient = apiClient;
}

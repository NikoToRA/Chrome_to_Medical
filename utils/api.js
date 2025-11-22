// API Client for Azure Functions

const API_BASE_URL = 'https://func-karte-ai-1763705952.azurewebsites.net/api'; // TODO: Update with actual URL

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async post(endpoint, data, options = {}) {
        const { timeout = 60000, retries = 1 } = options; // Default 60s timeout, 1 retry
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json'
        };

        // TODO: Add Auth Token if available
        // const token = await AuthManager.getToken();
        // if (token) headers['Authorization'] = `Bearer ${token}`;

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

                if (!response.ok) {
                    // Handle specific HTTP errors
                    if (response.status === 504 || response.status === 503) {
                        throw new Error(`Server Busy (Status: ${response.status})`);
                    }
                    throw new Error(`API Error: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(id);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeout}ms`);
                }
                throw error;
            }
        };

        try {
            return await executeFetch(0);
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

    async saveLog(type, metadata, userId) {
        // Fire and forget for logs? Or wait?
        // Usually better to not block UI.
        this.post('/save-log', { userId, type, content: metadata, metadata }).catch(console.error);
    }
}

// Create global instance
const apiClient = new ApiClient();

// Make it available globally
if (typeof window !== 'undefined') {
    window.ApiClient = apiClient;
}

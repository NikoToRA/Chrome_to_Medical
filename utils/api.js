// API Client for Azure Functions

const API_BASE_URL = 'https://func-karte-ai-1763705952.azurewebsites.net/api'; // TODO: Update with actual URL

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async post(endpoint, data) {
        const headers = {
            'Content-Type': 'application/json'
        };

        // TODO: Add Auth Token if available
        // const token = await AuthManager.getToken();
        // if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async chat(messages, system, model) {
        return this.post('/chat', { messages, system, model });
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

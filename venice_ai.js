const axios = require('axios');

class VeniceAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.venice.ai/api/v1/chat/completions';
    }

    async chat(content, model = 'openai-gpt-52') {
        try {
            const response = await axios.post(
                this.baseUrl,
                {
                    model: model,
                    messages: [{ role: 'user', content: content }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Venice AI Error:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

module.exports = VeniceAI;

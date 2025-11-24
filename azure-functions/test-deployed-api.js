const fetch = require('node-fetch'); // Node.js環境で実行するため

const API_ENDPOINT = 'http://localhost:7071/api/chat';
// const API_ENDPOINT = 'https://func-karte-ai-1763705952.azurewebsites.net/api/chat';

async function testDeployedApi() {
    console.log(`Testing Deployed API: ${API_ENDPOINT}\n`);

    const payload = {
        messages: [
            { role: 'user', content: 'こんにちは、元気ですか？' }
        ],
        system: 'あなたは親切な医療アシスタントです。',
        model: 'gpt-5-mini' // local.settings.jsonに合わせて変更
    };

    try {
        console.log('Sending request...');
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // 認証ヘッダーなしで試行（handler.jsに認証ロジックがなかったため）
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        try {
            const json = JSON.parse(text);
            console.log('\nResponse JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('\nResponse Text:', text);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testDeployedApi();

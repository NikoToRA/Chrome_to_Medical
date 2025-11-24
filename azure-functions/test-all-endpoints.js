const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:7071/api';

async function runTests() {
    console.log('🔍 Running API Connectivity Tests...\n');
    let success = true;

    // 1. Check Subscription
    try {
        console.log('Testing /api/check-subscription...');
        const res = await fetch(`${BASE_URL}/check-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'demo@example.com' })
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Success:', data);
        } else {
            console.error('❌ Failed:', res.status, res.statusText);
            success = false;
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
        success = false;
    }
    console.log('---');

    // 2. Verify Token (Mock)
    try {
        console.log('Testing /api/auth-verify-token...');
        // mock-serverではGET/POST両対応させるか、server.jsの実装次第
        // mock-server.jsの実装を確認すると、特にメソッド制限をしていないが、パス分岐がPOST想定の可能性がある
        // 実装再確認: parsedUrl.pathname === '/api/auth-verify-token' のみでメソッドチェックなし
        const res = await fetch(`${BASE_URL}/auth-verify-token?token=dummy`, {
            method: 'GET'
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Success:', data);
        } else {
            console.error('❌ Failed:', res.status, res.statusText);
            success = false;
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
        success = false;
    }
    console.log('---');

    // 3. AI Chat
    try {
        console.log('Testing /api/chat...');
        const res = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-5-mini'
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Success:', JSON.stringify(data).substring(0, 100) + '...');
        } else {
            console.error('❌ Failed:', res.status, res.statusText);
            success = false;
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
        success = false;
    }

    console.log('\n' + (success ? '✨ All tests passed!' : '⚠️ Some tests failed.'));
}

runTests();

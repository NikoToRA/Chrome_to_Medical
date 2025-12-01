// JWTトークンをデコードするスクリプト

const token = process.argv[2];

if (!token) {
    console.error('Usage: node decode-jwt-token.js <token>');
    process.exit(1);
}

try {
    // JWTトークンは3つの部分に分かれている: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
        console.error('Invalid JWT token format');
        process.exit(1);
    }
    
    // Base64URLデコード
    function base64UrlDecode(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
            base64 += new Array(5 - pad).join('=');
        }
        return Buffer.from(base64, 'base64').toString('utf-8');
    }
    
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    
    console.log('=== JWT Token Analysis ===');
    console.log('');
    console.log('Header:');
    console.log(JSON.stringify(header, null, 2));
    console.log('');
    console.log('Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');
    
    // 有効期限を確認
    if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = now > expDate;
        
        console.log('Expiration:');
        console.log(`  Issued at: ${new Date(payload.iat * 1000).toISOString()}`);
        console.log(`  Expires at: ${expDate.toISOString()}`);
        console.log(`  Current time: ${now.toISOString()}`);
        console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        
        if (isExpired) {
            const diffMinutes = Math.floor((now - expDate) / 1000 / 60);
            console.log(`  Expired ${diffMinutes} minutes ago`);
        } else {
            const diffMinutes = Math.floor((expDate - now) / 1000 / 60);
            console.log(`  Valid for ${diffMinutes} more minutes`);
        }
    }
    
    console.log('');
    console.log('Email:', payload.email || 'N/A');
    
} catch (error) {
    console.error('Error decoding token:', error.message);
    process.exit(1);
}


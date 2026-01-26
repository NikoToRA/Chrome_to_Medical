// JWT検証をテストするスクリプト
// 使用方法: JWT_SECRET=<secret> node test-jwt-verification.js <token>

const jwt = require('jsonwebtoken');

// テスト用のトークン（引数から取得）
const testToken = process.argv[2];
if (!testToken) {
    console.error('使用方法: JWT_SECRET=<secret> node test-jwt-verification.js <token>');
    process.exit(1);
}

// Azure Function Appに設定されているJWT_SECRET（環境変数から取得）
const jwtSecret = process.env.JWT_SECRET || process.argv[3];
if (!jwtSecret) {
    console.error('エラー: JWT_SECRET 環境変数を設定してください');
    console.error('例: JWT_SECRET=<Azure Portalから取得> node test-jwt-verification.js <token>');
    process.exit(1);
}

console.log('=== JWT Verification Test ===');
console.log('');

try {
    // トークンを検証
    const decoded = jwt.verify(testToken, jwtSecret);
    
    console.log('✅ Token verification SUCCESS');
    console.log('');
    console.log('Decoded payload:');
    console.log(JSON.stringify(decoded, null, 2));
    console.log('');
    console.log('Email:', decoded.email);
    
} catch (error) {
    console.log('❌ Token verification FAILED');
    console.log('');
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    console.log('');
    
    if (error.name === 'JsonWebTokenError') {
        console.log('This usually means:');
        console.log('  - JWT_SECRET does not match');
        console.log('  - Token signature is invalid');
    } else if (error.name === 'TokenExpiredError') {
        console.log('Token has expired');
    } else if (error.name === 'NotBeforeError') {
        console.log('Token is not yet valid');
    }
    
    process.exit(1);
}



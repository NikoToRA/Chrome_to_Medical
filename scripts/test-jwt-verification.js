// JWT検証をテストするスクリプト

const jwt = require('jsonwebtoken');

// テスト用のトークン（実際のトークンを使用）
const testToken = process.argv[2] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyMjA2Y2NAZ21haWwuY29tIiwiaWF0IjoxNzY0NDYyNTUwLCJleHAiOjE3NjQ0NjM0NTB9.5Mug6iibdm5X8BdJAyGFEUKP9wffDxuj-JqJraz9MYM";

// Azure Function Appに設定されているJWT_SECRET
const jwtSecret = process.argv[3] || "wgT0+Gp9eJn0wRCJuNakZ9PWhYnGTJ2UPCe63Xbq0aE=";

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


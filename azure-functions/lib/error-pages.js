/**
 * 認証エラーページのHTMLテンプレート生成
 */

function createErrorPage({ title, icon, message, details, actionUrl = '/', actionText = 'トップページに戻る' }) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
        <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    text-align: center;
                    padding: 50px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }
                .error-container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 600px;
                    width: 100%;
                    padding: 48px;
                }
                .error-icon {
                    font-size: 64px;
                    margin-bottom: 24px;
                }
                .error-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #c62828;
                    margin-bottom: 16px;
                }
                .error-message {
                    font-size: 18px;
                    color: #333;
                    margin-bottom: 12px;
                }
                .error-details {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 32px;
                    line-height: 1.6;
                }
                .action-button {
                    display: inline-block;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .action-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">${icon}</div>
                <div class="error-title">${title}</div>
                <div class="error-message">${message}</div>
                ${details ? `<div class="error-details">${details}</div>` : ''}
                <a href="${actionUrl}" class="action-button">${actionText}</a>
            </div>
        </body>
    </html>
    `;
}

function createTokenDisplayPage({ title, message, token, showCopyButton = true }) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
        <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; text-align: center; padding: 50px 20px; }
                .error-box {
                    background: #ffebee;
                    padding: 20px;
                    margin: 20px auto;
                    max-width: 600px;
                    border-radius: 8px;
                    border: 1px solid #ef5350;
                }
                .error-title { color: #c62828; font-size: 24px; margin-bottom: 16px; }
                .error-message { color: #666; margin-bottom: 16px; }
                .token-box {
                    background: #f0f0f0;
                    padding: 20px;
                    margin: 20px auto;
                    max-width: 600px;
                    word-break: break-all;
                    border-radius: 8px;
                }
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 16px;
                }
            </style>
        </head>
        <body>
            <div class="error-box">
                <div class="error-title">${title}</div>
                <div class="error-message">${message}</div>
            </div>
            <div class="token-box" id="token">${token}</div>
            ${showCopyButton ? '<button onclick="copyToken()">トークンをコピー</button>' : ''}
            <script>
                function copyToken() {
                    const token = document.getElementById('token').innerText;
                    navigator.clipboard.writeText(token).then(() => {
                        alert('トークンをコピーしました！');
                    });
                }
            </script>
        </body>
    </html>
    `;
}

module.exports = {
    createErrorPage,
    createTokenDisplayPage
};

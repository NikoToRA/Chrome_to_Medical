import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SuccessPage.css';

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const [customExtId, setCustomExtId] = useState('');
    const token = searchParams.get('token');
    const PROD_EXTENSION_ID = 'hggikgjlgfkbgkpcanglcinpggofdigl';

    const sendTokenToExtension = (extId) => {
        if (!token || !extId) return;
        if (window.chrome && window.chrome.runtime) {
            try {
                window.chrome.runtime.sendMessage(extId, {
                    type: 'AUTH_TOKEN',
                    token: token,
                    email: email || localStorage.getItem('userEmail')
                }, (response) => {
                    const lastError = window.chrome.runtime.lastError;
                    if (lastError) {
                        console.warn('Extension not found or error:', lastError.message);
                        // Only alert if manually triggered (to avoid spamming regular users)
                        if (extId !== PROD_EXTENSION_ID) {
                            alert('送信失敗: ' + lastError.message + '\nIDが正しいか確認してください。');
                        }
                    } else {
                        console.log('Token sent successfully to', extId);
                        if (extId !== PROD_EXTENSION_ID) alert('拡張機能に認証情報を送信しました！');
                    }
                });
            } catch (e) {
                console.error('SendMessage failed', e);
            }
        } else {
            if (extId !== PROD_EXTENSION_ID) alert('Chrome APIが見つかりません。');
        }
    };

    useEffect(() => {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }

        // Auto-send to Production ID
        if (token) {
            setTimeout(() => {
                sendTokenToExtension(PROD_EXTENSION_ID);
            }, 1000); // Slight delay to ensure extension is ready
        }
    }, [token]);

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            });
        }
    };

    return (
        <div className="success-page">
            <div className="success-container">
                <div className="success-icon">🎉</div>
                <h1>登録が完了しました！</h1>
                <p className="success-subtitle">
                    Karte AI+ へようこそ！<br />
                    14日間の無料トライアルが開始されました。
                </p>

                {email && (
                    <div className="email-info">
                        <p>登録メールアドレス: <strong>{email}</strong></p>
                    </div>
                )}

                {token && (
                    <div className="token-section">
                        <h3>認証トークン</h3>
                        <p className="token-description">以下のトークンをChrome拡張機能で使用してログインできます。</p>
                        <div className="token-box">{token}</div>
                        <button onClick={copyToken} className="copy-button">
                            {copied ? '✓ コピーしました' : 'トークンをコピー'}
                        </button>
                    </div>
                )}

                <div className="info-box">
                    <h2>次のステップ</h2>
                    <ol className="steps-list">
                        <li>
                            <strong>Chrome拡張機能をインストール</strong>
                            <p>Chrome Web Storeから「Karte AI+」をインストールしてください。</p>
                        </li>
                        <li>
                            <strong>メールでログイン（自動連携）</strong>
                            <p>拡張機能がインストールされていれば、自動的にログイン情報が送信されます。</p>
                        </li>
                        <li>
                            <strong>利用開始</strong>
                            <p>電子カルテの入力画面で拡張機能を使ってみましょう！</p>
                        </li>
                    </ol>
                </div>

                {/* Developer / Debug Section */}
                <div className="debug-section" style={{ marginTop: '20px', padding: '15px', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>開発者用：拡張機能連携デバッグ</h3>
                    <p style={{ fontSize: '12px', marginBottom: '10px' }}>
                        ローカル開発環境などでIDが異なる場合は、以下に入力して送信してください。<br />
                        Production ID: <code>hggikgjlgfkbgkpcanglcinpggofdigl</code>
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Extension ID (e.g. jklmn...)"
                            value={customExtId}
                            onChange={(e) => setCustomExtId(e.target.value)}
                            style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <button
                            onClick={() => sendTokenToExtension(customExtId)}
                            className="copy-button"
                            style={{ width: 'auto', padding: '0 15px' }}
                        >
                            送信
                        </button>
                    </div>
                </div>

                <div className="actions">
                    <a
                        href="https://chromewebstore.google.com/detail/karte-ai+/hggikgjlgfkbgkpcanglcinpggofdigl?hl=ja"
                        className="install-button"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Chrome拡張機能をインストール
                    </a>
                    <p className="help-text">
                        ご質問やサポートが必要な場合は、<br />
                        <a href="mailto:support@karte-ai-plus.com">support@karte-ai-plus.com</a> までお問い合わせください。
                    </p>
                </div>
            </div>
        </div>
    );
}

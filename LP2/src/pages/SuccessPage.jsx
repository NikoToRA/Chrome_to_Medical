import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SuccessPage.css';

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    // const [customExtId, setCustomExtId] = useState('');
    const token = searchParams.get('token');
    const PROD_EXTENSION_ID = 'hggikgjlgfkbgkpcanglcinpggofdigl';

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            // Suppress alert on mobile/non-extension environments for auto-send
            if (extId !== PROD_EXTENSION_ID) alert('Chrome APIが見つかりません。');
        }
    };

    useEffect(() => {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }

        // Auto-send to Production ID
        if (token && !isMobile) {
            setTimeout(() => {
                sendTokenToExtension(PROD_EXTENSION_ID);
            }, 1000); // Slight delay to ensure extension is ready
        }
    }, [token, isMobile]);

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
                <div className="success-header">
                    <div className="success-icon">🎉</div>
                    <h1>登録が完了しました！</h1>
                    <p className="success-subtitle">
                        Karte AI+ へようこそ！<br />
                        ご登録のメールアドレスに、利用開始に必要な情報をお送りしました。
                    </p>
                </div>

                {isMobile && (
                    <div className="mobile-warning">
                        <h3>📧 メールをご確認ください</h3>
                        <p>
                            PCでのセットアップが必要です。<br />
                            ご登録のメールアドレスに、<strong>Chrome拡張機能のリンク</strong>と<strong>認証トークン</strong>をお送りしました。
                        </p>
                        <p className="mobile-instruction">
                            <strong>次のステップ：</strong><br />
                            PCでメールを開き、記載された手順に従って利用を開始してください。
                        </p>
                    </div>
                )}

                {token && (
                    <div className="token-section">
                        <div className="token-card">
                            <h3>認証トークン</h3>
                            <p className="token-description">
                                {isMobile
                                    ? "PCでログインする際に、このトークンを使用します（メールにも記載されています）。"
                                    : "このトークンをコピーして、拡張機能に入力してください（メールにも記載されています）。"}
                            </p>
                            <div className="token-box">{token}</div>
                            <button onClick={copyToken} className="copy-button main-copy-btn">
                                {copied ? '✓ コピーしました' : 'トークンをコピー'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="setup-guide">
                    <h2>利用開始までの3ステップ</h2>
                    <div className="steps-container">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>PCで拡張機能をインストール</h3>
                            <p>Chrome Web Storeから拡張機能をダウンロードします。</p>
                            {isMobile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <button className="action-button disabled" disabled>
                                        スマホではインストール不可
                                    </button>
                                    <p style={{ fontSize: '12px', color: '#e53e3e', fontWeight: 'bold' }}>
                                        PCでメールをご確認ください
                                    </p>
                                </div>
                            ) : (
                                <a
                                    href="https://chromewebstore.google.com/detail/karte-ai+/hggikgjlgfkbgkpcanglcinpggofdigl?hl=ja"
                                    className="action-button primary"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Chrome Web Storeへ
                                </a>
                            )}
                        </div>

                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>AIパネルを開く</h3>
                            <p>
                                PCブラウザ右上の <img src="/images/extension-icon.png" alt="icon" style={{ width: '24px', verticalAlign: 'middle', margin: '0 4px' }} />
                                アイコンをクリックして、サイドパネルを開きます。
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>トークンを入力</h3>
                            <p>コピーした認証トークンを入力フォームに貼り付けて「ログイン」を押してください。</p>
                        </div>
                    </div>
                </div>

                <div className="footer-support">
                    <p>
                        ご不明な点は <a href="mailto:support@wonder-drill.com">support@wonder-drill.com</a> までお問い合わせください。
                    </p>
                </div>
            </div>
        </div>
    );
}

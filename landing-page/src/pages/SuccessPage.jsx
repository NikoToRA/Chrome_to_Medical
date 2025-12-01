import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SuccessPage.css';

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const token = searchParams.get('token');

    useEffect(() => {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

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
                    Karte AI+ へようこそ！<br/>
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
                            <strong>メールでログイン</strong>
                            <p>お送りしたメール内のリンクをクリックして、拡張機能にログインしてください。</p>
                        </li>
                        <li>
                            <strong>利用開始</strong>
                            <p>電子カルテの入力画面で拡張機能を使ってみましょう！</p>
                        </li>
                    </ol>
                </div>

                <div className="actions">
                    <a
                        href="https://chrome.google.com/webstore"
                        className="install-button"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Chrome拡張機能をインストール
                    </a>
                    <p className="help-text">
                        ご質問やサポートが必要な場合は、<br/>
                        <a href="mailto:support@karte-ai-plus.com">support@karte-ai-plus.com</a> までお問い合わせください。
                    </p>
                </div>
            </div>
        </div>
    );
}

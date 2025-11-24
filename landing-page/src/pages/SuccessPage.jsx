import './SuccessPage.css';

export default function SuccessPage() {
    const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/...'; // TODO: Update after publishing

    return (
        <div className="success-page">
            <div className="success-container">
                <div className="success-icon">✅</div>
                <h1>ご登録ありがとうございます！</h1>
                <p className="success-subtitle">14日間の無料体験が開始されました</p>

                <div className="steps-container">
                    <h2>次のステップ</h2>

                    <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h3>Chrome拡張機能をインストール</h3>
                            <p>以下のリンクからKarte AI+拡張機能をインストールしてください。</p>
                            <a
                                href={EXTENSION_URL}
                                className="install-button"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Chrome拡張機能をインストール
                            </a>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h3>メールを確認</h3>
                            <p>ご登録いただいたメールアドレスに、ログイン用のトークンを送信しました。</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h3>拡張機能でログイン</h3>
                            <p>拡張機能を開き、「アカウント」タブでメールに記載されたトークンを入力してログインしてください。</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h3>利用開始！</h3>
                            <p>ログイン後、すぐにAI機能をご利用いただけます。</p>
                        </div>
                    </div>
                </div>

                <div className="help-section">
                    <p>インストールでお困りの場合は、<a href="mailto:support@karte-ai-plus.com">サポート</a>までお問い合わせください。</p>
                </div>
            </div>
        </div>
    );
}

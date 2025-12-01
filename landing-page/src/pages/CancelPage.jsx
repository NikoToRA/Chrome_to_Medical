import { Link } from 'react-router-dom';
import './CancelPage.css';

export default function CancelPage() {
    return (
        <div className="cancel-page">
            <div className="cancel-container">
                <div className="cancel-icon">⚠️</div>
                <h1>決済がキャンセルされました</h1>
                <p className="cancel-subtitle">
                    決済手続きがキャンセルされました。<br/>
                    いつでも再度お申し込みいただけます。
                </p>

                <div className="info-box">
                    <h2>Karte AI+について</h2>
                    <ul className="features-list">
                        <li>✅ 14日間の無料トライアル</li>
                        <li>✅ 医療記録のAIアシスタント</li>
                        <li>✅ Chrome拡張機能で簡単利用</li>
                        <li>✅ いつでもキャンセル可能</li>
                    </ul>
                </div>

                <div className="actions">
                    <Link to="/" className="retry-button">
                        再度お申し込みする
                    </Link>
                    <p className="help-text">
                        ご質問やサポートが必要な場合は、<br/>
                        <a href="mailto:support@karte-ai-plus.com">support@karte-ai-plus.com</a> までお問い合わせください。
                    </p>
                </div>
            </div>
        </div>
    );
}


import { useState } from 'react';
import { sendMagicLink } from '../utils/api';
import './RegisterPage.css'; // Re-use styling

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        // API requires full profile object even for login/magic link, so we send dummy data
        const submitData = {
            email: email,
            name: 'Returning User',
            facilityName: 'Returning User',
            address: 'Returning User',
            phone: '00-0000-0000'
        };

        try {
            console.log('[LoginPage] Sending login request:', email);
            await sendMagicLink(submitData);
            console.log('[LoginPage] Magic Link sent successfully');
            setSuccess(true);
            setLoading(false);
        } catch (err) {
            console.error('[LoginPage] Error:', err);
            setError(err.message || 'ログインメールの送信に失敗しました');
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container" style={{ maxWidth: '500px' }}>
                <header className="register-header">
                    <h1>Karte AI+</h1>
                    <p className="subtitle">再ログイン / トークン再発行</p>
                </header>

                <form className="register-form" onSubmit={handleSubmit}>
                    <p className="form-description" style={{ marginBottom: '20px' }}>
                        登録済みのメールアドレスを入力してください。<br />
                        新しいログイン用リンク（認証トークン）をメールで送信します。
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    {success && (
                        <div className="success-message">
                            <h3>✅ メールを送信しました</h3>
                            <p>
                                <strong>{email}</strong> 宛にメールを送信しました。<br />
                                メール内のリンクをクリックしてください。
                            </p>
                            <p style={{ fontSize: '13px', color: '#666', marginTop: '15px' }}>
                                ※拡張機能をお使いの場合は、リンクをクリックすると自動的にログインが完了します。
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">メールアドレス</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@clinic.jp"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading || success}
                    >
                        {loading ? '送信中...' : 'ログインメールを送信'}
                    </button>

                    <p className="terms-text" style={{ marginTop: '20px' }}>
                        <a href="/register">新規登録はこちら</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

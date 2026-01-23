import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendMagicLink } from '../utils/api';
import './RegisterPage.css';

export default function RegisterPage() {
    const location = useLocation();
    const [isLoginMode, setIsLoginMode] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        facilityName: '',
        address: '',
        phone: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // URLパラメータからmodeを取得
        const searchParams = new URLSearchParams(location.search);
        const mode = searchParams.get('mode');
        if (mode === 'login') {
            setIsLoginMode(true);
        }
    }, [location]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        // ログインモードの場合、必須ではない項目にダミー値を入れる（API仕様による）
        const submitData = isLoginMode ? {
            ...formData,
            name: formData.name || 'Returning User',
            facilityName: formData.facilityName || 'Returning User',
            address: formData.address || 'Returning User',
            phone: formData.phone || '00-0000-0000'
        } : formData;

        try {
            console.log('[RegisterPage] フォーム送信開始:', submitData);
            await sendMagicLink(submitData);
            console.log('[RegisterPage] Magic Link送信成功');
            setSuccess(true);
            setLoading(false);
        } catch (err) {
            console.error('[RegisterPage] エラー発生:', err);
            setError(err.message || '登録に失敗しました');
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <header className="register-header">
                    <h1>Karte AI+</h1>
                    <p className="subtitle">医療記録のAIアシスタント</p>
                </header>

                <form className="register-form" onSubmit={handleSubmit}>
                    <h2>{isLoginMode ? 'ログイン / トークン再発行' : '新規登録'}</h2>
                    <p className="form-description">
                        {isLoginMode
                            ? 'メールアドレスを入力して認証トークンを再発行します'
                            : '14日間無料でお試しいただけます'}
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    {success && (
                        <div className="success-message">
                            <h3>✅ メールを送信しました</h3>
                            <p>
                                {formData.email} にログイン用のメールを送信しました。<br />
                                メールボックスを確認して、メール内のリンクをクリックしてください。
                            </p>
                            <p style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
                                ※ メールが届かない場合は、迷惑メールフォルダもご確認ください。
                            </p>
                        </div>
                    )}

                    {!isLoginMode && (
                        <>
                            <div className="form-group">
                                <label htmlFor="name">お名前 *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="例: 山田 太郎"
                                    required={!isLoginMode}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="facilityName">医療機関名 *</label>
                                <input
                                    type="text"
                                    id="facilityName"
                                    name="facilityName"
                                    value={formData.facilityName}
                                    onChange={handleChange}
                                    placeholder="例: ○○クリニック"
                                    required={!isLoginMode}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="address">住所 *</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="例: 東京都新宿区..."
                                    required={!isLoginMode}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">電話番号 *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="例: 03-1234-5678"
                                    required={!isLoginMode}
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">メールアドレス *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="例: example@clinic.jp"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading || success}
                    >
                        {loading ? '処理中...' : (isLoginMode ? 'ログイン用メールを送信' : '無料で登録する')}
                    </button>

                    <p className="terms-text">
                        {isLoginMode ? '続行' : '登録'}することで、<a href="/terms">利用規約</a>と<a href="/privacy">プライバシーポリシー</a>に同意したものとみなされます。
                    </p>
                </form>
            </div>
        </div>
    );
}

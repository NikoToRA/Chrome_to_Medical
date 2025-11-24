import { useState } from 'react';
import { registerAndPayment } from '../utils/api';
import './RegisterPage.css';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        facilityName: '',
        address: '',
        phone: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const checkoutUrl = await registerAndPayment(formData);
            // Redirect to Stripe checkout
            window.location.href = checkoutUrl;
        } catch (err) {
            setError(err.message);
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
                    <h2>新規登録</h2>
                    <p className="form-description">14日間無料でお試しいただけます</p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">お名前 *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="例: 山田 太郎"
                            required
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
                            required
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
                            required
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
                            required
                        />
                    </div>

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
                        disabled={loading}
                    >
                        {loading ? '処理中...' : '登録して課金する（14日間無料）'}
                    </button>

                    <p className="terms-text">
                        登録することで、<a href="/terms">利用規約</a>と<a href="/privacy">プライバシーポリシー</a>に同意したものとみなされます。
                    </p>
                </form>
            </div>
        </div>
    );
}

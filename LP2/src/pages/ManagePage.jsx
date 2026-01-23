import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ManagePage = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            // Use the generic API utility if available, or fetch directly
            const response = await fetch('https://func-karte-ai-1763705952.azurewebsites.net/api/send-portal-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || '管理用リンクを送信しました。メールをご確認ください。');
            } else {
                throw new Error(data.error || '送信に失敗しました。');
            }
        } catch (error) {
            console.error('API Error:', error);
            setStatus('error');
            setMessage(error.message || 'エラーが発生しました。時間をおいて再度お試しください。');
        }
    };

    return (
        <div className="font-sans text-gray-900 bg-white min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow flex items-center justify-center py-20 px-4">
                <div className="max-w-md w-full bg-slate-50 border border-slate-200 rounded-xl p-8 shadow-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">契約管理・解約</h1>
                        <p className="text-slate-600 text-sm">
                            ご登録のメールアドレスを入力してください。<br />
                            Stripe契約管理画面へのログインリンクを送信します。
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-emerald-800 mb-2">送信完了</h3>
                            <p className="text-emerald-700 text-sm mb-6">
                                {message}
                            </p>
                            <button
                                onClick={() => { setStatus('idle'); setEmail(''); }}
                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium hover:underline"
                            >
                                別のメールアドレスで試す
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="例: doctor@clinic.jp"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>

                            {status === 'error' && (
                                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className={`w-full py-3 px-4 rounded-lg text-white font-bold text-center transition-all ${status === 'loading'
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {status === 'loading' ? '送信中...' : '管理リンクを送信'}
                            </button>

                            <p className="text-xs text-center text-slate-500 mt-4">
                                ※拡張機能をご利用中の方は、拡張機能内の設定画面からも解約可能です。
                            </p>
                        </form>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ManagePage;

import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        // Run GA4 Purchase Event
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'purchase', {
                transaction_id: sessionId || 'unknown_transaction',
                value: 4980,
                currency: 'JPY',
                tax: 498, // Approximate 10% tax validation
                shipping: 0,
                items: [
                    {
                        item_id: 'standard_plan',
                        item_name: 'Karte AI+ Standard Plan',
                        price: 4980,
                        quantity: 1
                    }
                ]
            });
            console.log('GA4 Purchase Event Fired');
        }
    }, [sessionId]);

    return (
        <div className="font-sans text-gray-900 bg-white min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow flex items-center justify-center py-20 px-4">
                <div className="max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold text-slate-800 mb-4">
                        お支払いが完了しました
                    </h1>
                    <p className="text-xl text-slate-600 mb-8">
                        Karte AI+ のアップグレードありがとうございます。<br />
                        すべての機能が制限なくご利用いただけます。
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-8 text-left">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">!</span>
                            利用開始の手順
                        </h3>
                        <ol className="list-decimal pl-5 space-y-3 text-slate-700">
                            <li>
                                <strong>拡張機能を再読み込み</strong>してください（またはブラウザを更新）。
                            </li>
                            <li>
                                すでに拡張機能のサイドパネルを開いている場合は、一度閉じてから再度開いてください。
                            </li>
                            <li>
                                自動的に「スタンダードプラン」の状態が反映されます。
                            </li>
                        </ol>
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-500 text-sm">
                            ※ 反映されない場合は、一度ログアウトしてから再度ログインをお試しください。
                        </p>

                        <div className="flex gap-4 justify-center">
                            <Link
                                to="/"
                                className="inline-block px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
                            >
                                トップページへ戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PaymentSuccessPage;

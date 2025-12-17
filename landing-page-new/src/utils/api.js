const API_BASE_URL = 'https://apim-karte-ai-1763705952.azure-api.net/api';

async function fetchWithErrorHandling(url, options) {
    try {
        console.log('[API] リクエスト送信:', url, options);
        const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(60000) // 60秒タイムアウト
        });

        console.log('[API] レスポンス受信:', response.status, response.statusText);

        if (!response.ok) {
            // エラーレスポンスの本文を読み取る
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let errorDetails = null;

            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorBody = await response.json();
                    errorDetails = errorBody;
                    if (errorBody.error) {
                        errorMessage = errorBody.error;
                    } else if (errorBody.message) {
                        errorMessage = errorBody.message;
                    } else if (typeof errorBody === 'string') {
                        errorMessage = errorBody;
                    }
                } else {
                    const errorText = await response.text();
                    errorDetails = errorText;
                    if (errorText) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (parseError) {
                console.error('[API] エラーレスポンスの解析に失敗:', parseError);
            }

            console.error('[API] エラー詳細:', {
                status: response.status,
                statusText: response.statusText,
                message: errorMessage,
                details: errorDetails
            });

            const error = new Error(errorMessage);
            error.status = response.status;
            error.details = errorDetails;
            throw error;
        }

        return response;
    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            console.error('[API] タイムアウトエラー');
            throw new Error('リクエストがタイムアウトしました。もう一度お試しください。');
        } else if (error.message && error.message.includes('Failed to fetch')) {
            console.error('[API] ネットワークエラー:', error);
            throw new Error('ネットワークエラー: サーバーに接続できませんでした。インターネット接続を確認してください。');
        } else if (error.status) {
            // 既に処理されたエラー
            throw error;
        } else {
            console.error('[API] 予期しないエラー:', error);
            throw new Error(`予期しないエラーが発生しました: ${error.message || '不明なエラー'}`);
        }
    }
}

/**
 * Magic Linkを送信する
 * ユーザー情報をDBに保存し、Magic Link付きのメールを送信する
 */
export async function sendMagicLink(userData) {
    try {
        console.log('[API] Magic Link送信開始:', userData.email);

        // ユーザー情報をDBに保存し、Magic Linkメールを送信
        const response = await fetchWithErrorHandling(
            `${API_BASE_URL}/auth-send-magic-link`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            }
        );

        const result = await response.json();
        console.log('[API] Magic Link送信成功:', result);

        return result;
    } catch (error) {
        console.error('[API] sendMagicLink エラー:', error);

        // エラーメッセージを改善
        if (error.status === 400) {
            throw new Error('入力データに問題があります。すべての項目を正しく入力してください。');
        } else if (error.status === 500) {
            throw new Error('サーバーエラーが発生しました。しばらくしてからもう一度お試しください。');
        } else if (error.message) {
            throw error;
        } else {
            throw new Error('メールの送信に失敗しました。もう一度お試しください。');
        }
    }
}

/**
 * @deprecated この関数は使用しません。代わりに sendMagicLink() を使用してください。
 * Magic Linkをクリックした後にStripe Checkoutに自動リダイレクトされます。
 */
export async function registerAndPayment(userData) {
    // 後方互換性のため残していますが、使用しないでください
    return sendMagicLink(userData);
}

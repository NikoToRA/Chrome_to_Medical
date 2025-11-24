const API_BASE_URL = 'https://func-karte-ai-1763705952.azurewebsites.net/api';

export async function registerAndPayment(userData) {
    // 1. Save user data
    const registerResponse = await fetch(`${API_BASE_URL}/auth-send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });

    if (!registerResponse.ok) {
        throw new Error('ユーザー登録に失敗しました');
    }

    // 2. Create Stripe checkout session
    const stripeResponse = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: userData.email,
            returnUrl: `${window.location.origin}/success`
        })
    });

    if (!stripeResponse.ok) {
        throw new Error('決済画面の作成に失敗しました');
    }

    const { url } = await stripeResponse.json();
    return url;
}

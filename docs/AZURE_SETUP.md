# Azure バックエンド構築ガイド

このドキュメントでは、Karte AI+ のバックエンドとして機能する Azure Functions の構築手順を説明します。

## 1. 自動セットアップ（完了済み）

以下のリソースが自動構築され、コードもデプロイされました。

*   **Function App URL**: `https://func-karte-ai-1763705952.azurewebsites.net`
*   **Resource Group**: `rg-karte-ai`

## 2. 重要な次のステップ：キーの設定

**現在、APIキーなどがプレースホルダー（`<YOUR_...>`）になっているため、機能しません。**
以下の手順で実際のキーを設定してください。

1.  [Azure Portal](https://portal.azure.com) にログインします。
2.  リソースグループ `rg-karte-ai` を開きます。
3.  Function App `func-karte-ai-1763705952` を選択します。
4.  左メニューの「**設定 (Settings)**」>「**環境変数 (Environment variables)**」を開きます。
5.  以下の変数を編集し、実際の値（StripeやAnthropicの管理画面から取得）を入力して「**適用 (Apply)**」を押してください。

    *   `ANTHROPIC_API_KEY`: Claude APIキー
    *   `STRIPE_SECRET_KEY`: Stripe シークレットキー (`sk_...`)
    *   `STRIPE_WEBHOOK_SECRET`: Stripe Webhook 署名シークレット (`whsec_...`)
    *   `STRIPE_PRICE_ID`: Stripe 商品の価格ID (`price_...`)

## 3. Stripe の設定手順 (キーの取得方法)

まだStripeのキーをお持ちでない場合は、以下の手順で取得してください。

1.  **Stripe ダッシュボード** (https://dashboard.stripe.com) にログインします。
2.  **商品 (Products)** を作成:
    *   商品名: "Karte AI+ Pro" など
    *   価格: 月額 (例: 500円)
    *   作成後、`price_` で始まる **API ID** を控えます (これが `STRIPE_PRICE_ID`)。
3.  **APIキー** を取得:
    *   「開発者」>「APIキー」を開きます。
    *   **シークレットキー** (`sk_...`) を控えます (これが `STRIPE_SECRET_KEY`)。
4.  **Webhook** を設定:
    *   「開発者」>「Webhook」>「エンドポイントを追加」をクリック。
    *   **エンドポイントURL**: `https://func-karte-ai-1763705952.azurewebsites.net/api/stripe-webhook`
    *   **送信イベント**:
        *   `checkout.session.completed`
        *   `customer.subscription.deleted`
        *   `customer.subscription.updated`
    *   作成後、"署名シークレット" (`whsec_...`) を控えます (これが `STRIPE_WEBHOOK_SECRET`)。

## 4. 動作確認

キー設定後、以下のURLにアクセスして確認できます。

*   `https://func-karte-ai-1763705952.azurewebsites.net/api/check-subscription?email=test@example.com`
    *   期待される応答: `{"isSubscribed": false}`

## 4. 拡張機能の更新

拡張機能側の `utils/api.js` は既に新しいURLに更新済みです。
Chromeで拡張機能をリロードして動作を確認してください。後に行います):
    *   エンドポイントURL: `https://<YOUR_APP_NAME>.azurewebsites.net/api/stripe-webhook`
    *   監視するイベント:
        *   `checkout.session.completed`
        *   `customer.subscription.updated`

## 3. 環境変数の設定
2. アプリケーションを登録し、Client ID を取得。
3. ユーザーフロー（サインアップ・サインイン）を作成。
4. `utils/auth.js` に MSAL.js などのライブラリを使って実装を追加。

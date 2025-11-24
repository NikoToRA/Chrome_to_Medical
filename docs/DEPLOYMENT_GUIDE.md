# デプロイメントガイド

## 概要

このドキュメントでは、ランディングページのデプロイとChrome拡張機能公開後の完全なユーザーフローを説明します。

---

## 1. ランディングページのデプロイ（Vercel）

### 前提条件
- Vercelアカウント（無料）
- GitHubリポジトリにコードがpush済み

### 手順

#### 1.1 Vercelにログイン
1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでログイン

#### 1.2 プロジェクトをインポート
1. 「Add New」→「Project」をクリック
2. リポジトリ一覧から `Chrome_to_Medical` を選択
3. 「Import」をクリック

#### 1.3 ビルド設定
- **Framework Preset**: Vite
- **Root Directory**: `landing-page`（← 重要！）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### 1.4 デプロイ
- 「Deploy」をクリック
- 数分でデプロイ完了

#### 1.5 URL確認
- デプロイ完了後、`https://chrome-to-medical.vercel.app` のようなURLが発行されます
- このURLをメモしてください

---

## 2. Chrome拡張機能のリンク更新

### 2.1 VercelのURLを拡張機能に反映

デプロイ完了後、拡張機能内のリンクを実際のURLに更新します。

**ファイル**: `sidepanel/sidepanel.html`

```html
<!-- 変更前 -->
<a href="https://karte-ai-plus.vercel.app" target="_blank">こちらから登録</a>

<!-- 変更後（実際のVercel URLに置き換え） -->
<a href="https://chrome-to-medical.vercel.app" target="_blank">こちらから登録</a>
```

### 2.2 成功ページの拡張機能URL更新

Chrome Web Store公開後、成功ページのリンクも更新します。

**ファイル**: `landing-page/src/pages/SuccessPage.jsx`

```javascript
// 変更前
const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/...';

// 変更後（実際のWeb Store URLに置き換え）
const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/abcdefghijklmnop';
```

変更後、再度Vercelにデプロイ：
```bash
cd landing-page
git add .
git commit -m "Update extension URL"
git push
```

---

## 3. 完全なユーザーフロー

### 3.1 登録から利用開始まで

```
1. ユーザーがGoogle検索などでLPに到達
   ↓
2. LP（https://chrome-to-medical.vercel.app）で情報入力
   - お名前、医療機関名、住所、電話番号、メールアドレス
   ↓
3. 「登録して課金する」ボタンをクリック
   ↓
4. Stripe決済画面に遷移
   - テストカード: 4242 4242 4242 4242
   - 14日間無料トライアル開始
   ↓
5. 決済完了後、成功ページ（/success）に遷移
   - ステップ1: Chrome拡張機能のインストールリンク表示
   - ステップ2: メール確認（トークンが記載されている）
   - ステップ3: 拡張機能でログイン
   ↓
6. ユーザーがChrome Web Storeから拡張機能をインストール
   ↓
7. 拡張機能を開く
   ↓
8. 「アカウント」タブでメールアドレス入力
   ↓
9. メールに記載されたトークンを入力してログイン
   ↓
10. 利用開始！
```

---

## 4. テスト方法

### 4.1 ローカルテスト

#### ランディングページ
```bash
cd landing-page
npm run dev
# http://localhost:5173 で確認
```

#### Chrome拡張機能
1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `Chrome_to_Medical` ディレクトリを選択

#### Azure Functions
- すでにデプロイ済み（`https://func-karte-ai-1763705952.azurewebsites.net/api`）
- 環境変数も設定済み

### 4.2 統合テスト

1. LPでテストメールアドレスを入力して登録
2. Stripe決済（テストカード使用）
3. 成功ページ表示確認
4. メール（またはAzureログ）でトークン確認
5. 拡張機能でログイン
6. 正常に利用できることを確認

---

## 5. 本番環境チェックリスト

### デプロイ前
- [ ] Vercel URLを拡張機能に反映済み
- [ ] Stripe本番APIキーをAzure FunctionsのApp Settingsに設定済み
  - `STRIPE_SECRET_KEY` (本番用: `sk_live_...`)
  - `STRIPE_PRICE_ID` (本番用のPrice ID)
  - `STRIPE_WEBHOOK_SECRET` (本番用のWebhook Secret)
- [ ] SendGrid設定済み
- [ ] プライバシーポリシーURL設定済み
- [ ] Stripe Webhookエンドポイント設定済み
  - `https://func-karte-ai-1763705952.azurewebsites.net/api/stripe-webhook`

### デプロイ後
- [ ] LPが正常に表示される
- [ ] 登録フォームが正常に動作する
- [ ] Stripe決済が正常に完了する
- [ ] 成功ページが表示される
- [ ] メールが送信される
- [ ] 拡張機能でログインできる

---

## 6. トラブルシューティング

### LP: 「ユーザー登録に失敗しました」
- Azure Functionsが稼働しているか確認
- CORS設定を確認

### Stripe: 決済画面に遷移しない
- `create-checkout-session` のレスポンスを確認
- Stripe APIキーが正しいか確認

### 拡張機能: ログインできない
- メールアドレスが正しいか確認
- Azure Functionsが稼働しているか確認
- トークンの有効期限（15分）を確認

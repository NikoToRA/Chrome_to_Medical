# 次のステップ実装計画

**作成日**: 2025-11-29  
**目的**: Magic Linkクリック後のフローを完成させるための詳細実装計画

---

## 📋 実装状況サマリー

### ✅ 完了済み

1. **メール送信機能** ✅
   - Azure Communication Services設定完了
   - 日本語メールテンプレート作成
   - Magic Link送信確認

2. **認証フロー改善** ✅
   - AuthManagerの初期化待機
   - トークン検証の改善
   - エラーハンドリング強化

3. **キャンセルページ** ✅
   - `CancelPage.jsx` 作成
   - `CancelPage.css` 作成
   - ルーティング追加 (`/cancel`)

4. **auth-verify-token改善** ✅
   - ログ出力の追加
   - エラーハンドリング改善
   - 環境変数チェックの強化

---

## 🎯 次のステップ詳細

### ステップ1: 環境変数の確認と設定 ⚠️ **要確認**

**目的**: Stripe Checkoutへのリダイレクトに必要な環境変数を確認・設定

**必要な環境変数**:

1. `SUCCESS_PAGE_URL`
   - **現在の値**: `https://karte-ai-plus.com/success` (プレースホルダー)
   - **実際の値**: デプロイされたLPのURL + `/success`
   - **例**: `https://your-landing-page.azurestaticapps.net/success`

2. `CANCEL_PAGE_URL`
   - **現在の値**: `https://karte-ai-plus.com/cancel` (プレースホルダー)
   - **実際の値**: デプロイされたLPのURL + `/cancel`
   - **例**: `https://your-landing-page.azurestaticapps.net/cancel`

3. `STRIPE_SECRET_KEY` ✅ (設定済み)
4. `STRIPE_PRICE_ID` ✅ (設定済み)
5. `JWT_SECRET` ✅ (設定済み)

**確認方法**:

```bash
# Azure CLIで環境変数を確認
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='SUCCESS_PAGE_URL' || name=='CANCEL_PAGE_URL'].{Name:name, Value:value}" \
  --output table
```

**設定方法**:

```bash
# 実際のLPのURLに置き換えてください
LP_URL="https://your-actual-landing-page-url.com"

az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings \
    SUCCESS_PAGE_URL="${LP_URL}/success" \
    CANCEL_PAGE_URL="${LP_URL}/cancel"
```

**完了条件**:
- ✅ `SUCCESS_PAGE_URL` が実際のLPのURLに設定されている
- ✅ `CANCEL_PAGE_URL` が実際のLPのURLに設定されている
- ✅ Function Appが再起動されている（環境変数変更後）

---

### ステップ2: ランディングページのデプロイ確認 ⚠️ **要確認**

**目的**: 成功ページとキャンセルページが正しくデプロイされているか確認

**確認項目**:

1. **ルーティング**
   - `/success` が正しく動作するか
   - `/cancel` が正しく動作するか

2. **ページ表示**
   - SuccessPageが正しく表示されるか
   - CancelPageが正しく表示されるか

3. **スタイリング**
   - CSSが正しく読み込まれているか
   - レスポンシブデザインが機能しているか

**確認方法**:

```bash
# ローカルで確認
cd landing-page
npm run dev

# ブラウザで確認
# http://localhost:5173/success
# http://localhost:5173/cancel
```

**デプロイ方法**:

```bash
# デプロイスクリプトを実行
./scripts/deploy-landing-page.sh
```

**完了条件**:
- ✅ `/success` ページが正しく表示される
- ✅ `/cancel` ページが正しく表示される
- ✅ デプロイが完了している

---

### ステップ3: Magic Linkクリック → Stripe Checkout フローのテスト 🧪

**目的**: エンドツーエンドでフローが正しく動作するか確認

**テスト手順**:

1. **LPフォーム送信**
   ```
   LPフォーム → sendMagicLink() → メール送信
   ```

2. **メール受信確認**
   - メールボックスを確認
   - Magic Linkが含まれているか確認

3. **Magic Linkクリック**
   ```
   Magic Linkクリック → auth-verify-token → Stripe Checkout
   ```

4. **Stripe Checkout表示確認**
   - Stripe Checkoutページが表示されるか
   - 正しい価格が表示されているか
   - 14日間の無料トライアルが表示されているか

5. **キャンセルテスト**
   - Stripe Checkoutで「戻る」をクリック
   - `/cancel` ページにリダイレクトされるか確認

6. **成功テスト**
   - Stripe Checkoutで決済を完了（テストカード使用）
   - `/success` ページにリダイレクトされるか確認
   - トークンがURLパラメータに含まれているか確認

**テストカード情報** (Stripe Test Mode):

```
カード番号: 4242 4242 4242 4242
有効期限: 任意の未来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意の5桁（例: 12345）
```

**完了条件**:
- ✅ Magic Linkクリック → Stripe Checkout自動リダイレクト
- ✅ Stripe Checkoutで決済情報を入力できる
- ✅ キャンセル → `/cancel` ページにリダイレクト
- ✅ 成功 → `/success` ページにリダイレクト（トークン付き）

---

### ステップ4: Stripe Webhookの確認 ⚠️ **要確認**

**目的**: Stripe Checkout完了後のWebhook処理が正しく動作するか確認

**確認項目**:

1. **Webhookエンドポイント**
   - URL: `https://func-karte-ai-1763705952.azurewebsites.net/api/stripe-webhook`
   - メソッド: POST
   - 署名検証: 有効

2. **Webhookイベント**
   - `checkout.session.completed` が処理されるか
   - サブスクリプション情報が保存されるか

3. **ログ確認**
   - Application InsightsでWebhookのログを確認

**確認方法**:

```bash
# Stripe CLIでWebhookをテスト（ローカル開発時）
stripe listen --forward-to http://localhost:7071/api/stripe-webhook

# テストイベントを送信
stripe trigger checkout.session.completed
```

**完了条件**:
- ✅ Webhookが正しく受信される
- ✅ サブスクリプション情報が保存される
- ✅ ログにエラーがない

---

### ステップ5: 成功ページの自動ログイン機能の確認 🧪

**目的**: 成功ページから拡張機能への自動ログインが機能するか確認

**確認項目**:

1. **トークン取得**
   - URLパラメータからトークンを取得できるか

2. **拡張機能への送信**
   - `chrome.runtime.sendMessage` が正しく動作するか
   - 拡張機能がトークンを受信できるか

3. **自動ログイン**
   - 拡張機能が自動的にログイン状態になるか

4. **フォールバック**
   - 拡張機能がインストールされていない場合の表示
   - 手動コピー機能が動作するか

**テスト手順**:

1. Stripe Checkoutを完了
2. `/success?token=xxx` にリダイレクト
3. 拡張機能がインストールされている状態で確認
4. 拡張機能がインストールされていない状態で確認

**完了条件**:
- ✅ 拡張機能がインストール済み → 自動ログイン成功
- ✅ 拡張機能が未インストール → 手動コピーUI表示
- ✅ トークンが正しく表示される

---

## 🔍 トラブルシューティング

### 問題1: Magic Linkクリック後、Stripe Checkoutにリダイレクトされない

**原因**:
- 環境変数が設定されていない
- Stripe Checkoutセッション作成に失敗している

**解決方法**:
1. 環境変数を確認
   ```bash
   az functionapp config appsettings list --name func-karte-ai-1763705952 --resource-group rg-karte-ai
   ```
2. Application Insightsでログを確認
3. `auth-verify-token` のログを確認

### 問題2: キャンセルページにリダイレクトされない

**原因**:
- `CANCEL_PAGE_URL` が設定されていない
- ルーティングが正しく設定されていない

**解決方法**:
1. `CANCEL_PAGE_URL` を確認・設定
2. LPのルーティングを確認
3. デプロイを再実行

### 問題3: 成功ページでトークンが表示されない

**原因**:
- URLパラメータが正しく渡されていない
- `success_url` の設定が間違っている

**解決方法**:
1. `auth-verify-token` の `successUrl` 生成ロジックを確認
2. Stripe Checkoutセッションの `success_url` を確認
3. ブラウザのURLを確認

---

## 📝 チェックリスト

### 環境変数設定
- [ ] `SUCCESS_PAGE_URL` を実際のLPのURLに設定
- [ ] `CANCEL_PAGE_URL` を実際のLPのURLに設定
- [ ] Function Appを再起動

### ランディングページ
- [ ] `/success` ページが正しく表示される
- [ ] `/cancel` ページが正しく表示される
- [ ] デプロイが完了している

### フローテスト
- [ ] LPフォーム送信 → メール受信
- [ ] Magic Linkクリック → Stripe Checkout表示
- [ ] Stripe Checkoutキャンセル → `/cancel` ページ
- [ ] Stripe Checkout完了 → `/success` ページ（トークン付き）

### Webhook
- [ ] Webhookが正しく受信される
- [ ] サブスクリプション情報が保存される

### 自動ログイン
- [ ] 拡張機能がインストール済み → 自動ログイン成功
- [ ] 拡張機能が未インストール → 手動コピーUI表示

---

## 🎯 完了条件

すべてのステップが完了し、以下が確認できれば完了：

1. ✅ Magic Linkクリック → Stripe Checkout自動リダイレクト
2. ✅ Stripe Checkout完了 → 成功ページ → 拡張機能への自動ログイン
3. ✅ Stripe Checkoutキャンセル → キャンセルページ
4. ✅ エンドツーエンドでフローが正しく動作

---

## 📚 参考ドキュメント

- `docs/UX_FLOW.md` - UXフローの詳細
- `docs/UX_FLOW_TEST_GUIDE.md` - テストガイド
- `docs/STRIPE_CONFIGURATION.md` - Stripe設定
- `logs/2025-11-29_EMAIL_SETUP_COMPLETE.md` - 前回の実装ログ

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-29



# Function App 再構築完了レポート

## 実施内容

### 1. 環境変数のバックアップ ✅
- すべての環境変数をJSONとテキスト形式でバックアップ
- バックアップファイル:
  - `/Users/suguruhirayama/Chrome_to_Medical/backup-env-vars.json`
  - `/Users/suguruhirayama/Chrome_to_Medical/backup-env-vars.txt`

### 2. 古いFunction Appの削除 ✅
```bash
az functionapp delete --name func-karte-ai-1763705952 --resource-group rg-karte-ai
```

### 3. 新しいFunction Appの作成 ✅
```bash
az functionapp create \
  --name func-karte-ai-1763705952 \
  --storage-account stkarteai1763705952 \
  --resource-group rg-karte-ai \
  --consumption-plan-location japaneast \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux
```

### 4. 環境変数の復元 ✅
以下の環境変数を設定:
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `AZURE_COMMUNICATION_CONNECTION_STRING`
- `AZURE_STORAGE_CONNECTION_STRING`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `SUCCESS_PAGE_URL`
- `CANCEL_PAGE_URL`
- `EMAIL_SENDER_ADDRESS`
- その他

**重要**: `SKIP_AUTH=false`に設定（本番モード）

### 5. コードのデプロイ ✅
```bash
cd azure-functions
func azure functionapp publish func-karte-ai-1763705952
```

デプロイされた関数:
- auth-register
- auth-send-magic-link
- auth-verify-token
- cancel-request-otp
- cancel-verify-otp
- chat
- check-subscription
- contract-consent
- contract-status
- create-checkout-session
- data-cleanup (timer)
- log-insertion
- rag-embedding-pipeline (blob trigger)
- save-log
- stripe-trial-reminder (timer)
- stripe-webhook

### 6. キャッシュ設定の削除 ✅
以下の設定を削除してキャッシュ問題を解決:
- `WEBSITE_RUN_FROM_PACKAGE`
- `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING`
- `WEBSITE_CONTENTSHARE`

### 7. 再デプロイと再起動 ✅
```bash
func azure functionapp publish func-karte-ai-1763705952 --build-native-deps
az functionapp restart --name func-karte-ai-1763705952 --resource-group rg-karte-ai
```

## 現在の状況

### ⚠️ 問題が継続
- `auth-verify-token`エンドポイントへのリクエストがHTTP 401を返す
- レスポンスの`content-length: 0`（空のレスポンス）
- Application Insightsにログが記録されていない

### 可能性のある原因
1. **コールドスタート**: Linux Consumption Planの初回起動に時間がかかる
2. **ファイル同期遅延**: デプロイ後のファイル同期が完了していない
3. **ランタイム問題**: Node.js 20ランタイムの初期化問題
4. **権限問題**: 関数がファイルシステムにアクセスできない

## 次のステップ

### 即座に確認すべきこと

1. **Azureポータルで関数のファイルを直接確認**
   - Azure Portal → Function App → Functions → auth-verify-token
   - Code + Test タブでファイル内容を確認
   - デプロイされたコードが最新か確認

2. **関数の詳細ログを有効化**
   - Azure Portal → Function App → Monitoring → Log stream
   - リアルタイムでログを確認

3. **別のテストトークンで再試行**
   最新のテストURL:
   ```
   https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ0Njg5ODgsImV4cCI6MTc2NDQ2OTg4OH0.SAUfUEMG_dIlpMLusygEQcMXJEHt89v92VncUc1xXOo
   ```

4. **ローカルで動作確認**
   ```bash
   cd azure-functions
   func start --port 7072
   ```
   その後、ローカルでテスト:
   ```
   http://localhost:7072/api/auth-verify-token?token=...
   ```

### 代替アプローチ

もしAzure側の問題が解決しない場合:

1. **Azure App Serviceに移行**
   - Consumption PlanではなくApp Service Planを使用
   - より安定した動作が期待できる

2. **環境を完全にクリーン**
   - リソースグループ全体を削除して再作成
   - ゼロから構築し直す

## 生成されたスクリプト

### `/Users/suguruhirayama/Chrome_to_Medical/scripts/restore-env-vars.sh`
環境変数を復元するスクリプト

## バックアップファイル

- `backup-env-vars.json`: 環境変数のJSON形式バックアップ
- `backup-env-vars.txt`: 環境変数の読みやすい形式バックアップ

## 重要な注意事項

- 古い`WEBSITE_RUN_FROM_PACKAGE`設定は削除済み
- すべての環境変数は復元済み
- `SKIP_AUTH`は`false`に設定（本番モード）
- デプロイは2回実施（通常デプロイ + native deps付きデプロイ）
- Function Appは再起動済み

---

生成日時: 2025-11-30 10:56 JST



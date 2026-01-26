# Azureポータルで直接確認する手順

## 問題の状況

- `auth-verify-token`がHTTP 401を返す（content-length: 0）
- Application Insightsにログが記録されていない
- ローカルテストはNode.jsバージョン不一致で失敗

## Azureポータルでの確認手順

### 1. Function Appのログストリームを確認

#### 手順:
1. Azure Portalにアクセス: https://portal.azure.com
2. 検索バーで「func-karte-ai-1763705952」と入力
3. Function App「func-karte-ai-1763705952」を開く
4. 左メニューから「Monitoring」→「Log stream」を選択
5. ログストリームが表示されるのを待つ
6. **別のブラウザタブで**以下のURLを開く:
   ```
   https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ0Njg5ODgsImV4cCI6MTc2NDQ2OTg4OH0.SAUfUEMG_dIlpMLusygEQcMXJEHt89v92VncUc1xXOo
   ```
7. Log streamタブに戻って、リアルタイムログを確認

#### 確認すべきこと:
- 関数が実行されているか
- エラーメッセージが表示されているか
- `[AuthVerifyToken]`で始まるログが表示されているか

---

### 2. デプロイされたコードを直接確認

#### 手順:
1. Azure Portal → Function App「func-karte-ai-1763705952」
2. 左メニューから「Functions」を選択
3. 関数一覧から「auth-verify-token」をクリック
4. 「Code + Test」タブを開く
5. 左側のファイルツリーから「index.js」を選択
6. コード内容を確認

#### 確認すべきこと:
- ファイルの先頭に`const jwt = require('jsonwebtoken');`があるか
- 32行目付近に`context.log('[AuthVerifyToken] Configuration check:'`があるか
- 196行目付近（catch block）に詳細なエラーハンドリングがあるか

**期待されるコードの一部:**
```javascript
context.log('[AuthVerifyToken] Configuration check:', {
    hasStripe,
    hasPriceId,
    hasSuccessUrl,
    shouldRedirectToCheckout,
    email
});
```

---

### 3. 環境変数を再確認

#### 手順:
1. Azure Portal → Function App「func-karte-ai-1763705952」
2. 左メニューから「Settings」→「Environment variables」を選択
3. 以下の環境変数が設定されていることを確認:
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `SUCCESS_PAGE_URL`
   - `CANCEL_PAGE_URL`
   - `FUNCTIONS_WORKER_RUNTIME` (値: `node`)
   - `FUNCTIONS_EXTENSION_VERSION` (値: `~4`)
   - `AzureWebJobsStorage`

#### 確認すべきこと:
- すべての値が設定されているか（`null`や空でないか）
- `WEBSITE_RUN_FROM_PACKAGE`が**存在しないこと**を確認

---

### 4. Platform Featuresを確認

#### 手順:
1. Azure Portal → Function App「func-karte-ai-1763705952」
2. 左メニューから「Settings」→「Configuration」を選択
3. 「General settings」タブを開く
4. 以下を確認:
   - **Stack**: Node.js
   - **Major Version**: 20
   - **Platform**: 64 Bit
   - **Always On**: Off (Consumption Planでは利用不可)

---

### 5. デプロイメント履歴を確認

#### 手順:
1. Azure Portal → Function App「func-karte-ai-1763705952」
2. 左メニューから「Deployment」→「Deployment Center」を選択
3. 最新のデプロイメント状態を確認
4. 「Logs」タブでデプロイメントログを確認

#### 確認すべきこと:
- 最新のデプロイメントが成功しているか
- デプロイメント時刻が最近か（2025-11-30 10:55頃）
- エラーメッセージがないか

---

### 6. 関数を手動でテスト

#### 手順:
1. Azure Portal → Function App「func-karte-ai-1763705952」
2. 左メニューから「Functions」→「auth-verify-token」を選択
3. 「Code + Test」タブを開く
4. 上部の「Test/Run」ボタンをクリック
5. 「HTTP method」を`GET`に設定
6. 「Query」セクションに以下を追加:
   - **Key**: `token`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ0Njg5ODgsImV4cCI6MTc2NDQ2OTg4OH0.SAUfUEMG_dIlpMLusygEQcMXJEHt89v92VncUc1xXOo`
7. 「Run」ボタンをクリック
8. 右側のパネルで結果を確認

#### 確認すべきこと:
- HTTP Response codeは何か
- Response bodyに内容があるか
- Logsセクションに`[AuthVerifyToken]`のログが表示されるか

---

## 予想される問題と対処法

### 問題1: コードが古いまま
**症状**: `Code + Test`で確認したコードにログ出力がない

**対処法**:
```bash
# ローカルで再デプロイ
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote
az functionapp restart --name func-karte-ai-1763705952 --resource-group rg-karte-ai
```

### 問題2: 環境変数が設定されていない
**症状**: Environment variablesで値が`null`または空

**対処法**:
```bash
# 環境変数を再設定
bash /Users/suguruhirayama/Chrome_to_Medical/scripts/restore-env-vars.sh
```

### 問題3: Runtime version不一致
**症状**: General settingsでNode.jsバージョンが20でない

**対処法**:
Azure Portal → Configuration → General settings → Stack settingsで:
- **Stack**: Node.js
- **Major Version**: 20 LTS

設定後、「Save」→「Continue」→再起動

### 問題4: CORS設定
**症状**: ブラウザのコンソールにCORSエラー

**対処法**:
Azure Portal → Function App → CORS設定で:
- `https://stkarteai1763705952.z11.web.core.windows.net`を追加
- または`*`を追加（開発中のみ）

---

## 次の調査ステップ

上記の確認で問題が見つからない場合:

1. **Kudu (Advanced Tools)でファイルシステムを確認**
   - Azure Portal → Function App → Development Tools → Advanced Tools
   - 「Go」をクリック
   - Kuduコンソールで`site/wwwroot`を確認

2. **Application Insightsのトレースを詳細確認**
   ```kusto
   traces
   | where timestamp > ago(1h)
   | where message contains "AuthVerifyToken" or message contains "auth-verify-token"
   | project timestamp, message, severityLevel
   | order by timestamp desc
   ```

3. **完全な再作成**
   - Resource Group全体を削除
   - すべてのリソースをゼロから再作成

---

## テスト用URL

### 最新のテストトークン（15分有効）:
```
https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ0Njg5ODgsImV4cCI6MTc2NDQ2OTg4OH0.SAUfUEMG_dIlpMLusygEQcMXJEHt89v92VncUc1xXOo
```

### 新しいトークンを生成する場合:
```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
# 環境変数 JWT_SECRET を設定してから実行
# JWT_SECRETはAzure Portalの環境変数設定から取得してください
node -e "const jwt = require('jsonwebtoken'); const secret = process.env.JWT_SECRET; if(!secret){console.error('JWT_SECRET環境変数を設定してください'); process.exit(1);} const email = 'test@example.com'; const token = jwt.sign({ email }, secret, { expiresIn: '15m' }); console.log('https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=' + token);"
```

---

生成日時: 2025-11-30 11:05 JST



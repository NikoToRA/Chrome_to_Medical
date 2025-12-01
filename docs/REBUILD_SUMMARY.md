# Function App完全再構築 - サマリー

## 🎯 実施内容

古いコードが動作しない問題を根本的に解決するため、Function Appを**完全に削除して再作成**しました。

## ✅ 完了したステップ

### 1. バックアップ
- すべての環境変数をバックアップ
  - `backup-env-vars.json`
  - `backup-env-vars.txt`

### 2. 削除
- 古いFunction App `func-karte-ai-1763705952`を削除

### 3. 再作成
- 新しいFunction Appを作成
  - Runtime: Node.js 20
  - OS: Linux
  - Plan: Consumption (japaneast)

### 4. 環境変数復元
- すべての環境変数を復元
- `SKIP_AUTH=false`に設定（本番モード）

### 5. デプロイ
- 最新コードをデプロイ（2回実施）
- キャッシュ設定を削除
  - `WEBSITE_RUN_FROM_PACKAGE`削除
  - `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING`削除
  - `WEBSITE_CONTENTSHARE`削除

### 6. 再起動
- Function Appを再起動

## ⚠️ 現在の状況

### 問題が継続中
- `auth-verify-token`エンドポイントがHTTP 401を返す
- レスポンスボディが空（`content-length: 0`）
- Application Insightsにログが記録されない

### 原因の可能性
1. **デプロイ完了の遅延**: Linux Consumption Planでファイル同期が遅い
2. **コールドスタート**: 初回起動に時間がかかる
3. **ランタイム初期化問題**: Node.js 20の初期化が完了していない
4. **ファイルシステム権限**: デプロイされたファイルにアクセスできない

## 📋 次のアクション

### ユーザーにお願いする確認作業

Azureポータルで以下を確認してください:

#### 1. ログストリームで実行ログを確認
- Azure Portal → Function App → Monitoring → Log stream
- テストURLをブラウザで開いてログを確認

#### 2. デプロイされたコードを確認
- Azure Portal → Function App → Functions → auth-verify-token → Code + Test
- `index.js`の内容が最新か確認
- 32行目付近に`context.log('[AuthVerifyToken] Configuration check:'`があるか

#### 3. 環境変数を確認
- Azure Portal → Function App → Settings → Environment variables
- `JWT_SECRET`、`STRIPE_SECRET_KEY`などが設定されているか
- `WEBSITE_RUN_FROM_PACKAGE`が**ない**ことを確認

#### 4. 手動テスト
- Azure Portal → Function App → Functions → auth-verify-token → Code + Test → Test/Run
- GETリクエストでtokenパラメータを設定して実行

詳細な手順は以下を参照:
**`/Users/suguruhirayama/Chrome_to_Medical/docs/AZURE_PORTAL_DIRECT_CHECK.md`**

## 🧪 テスト用URL

最新のテストトークン（15分有効）:
```
https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ0Njg5ODgsImV4cCI6MTc2NDQ2OTg4OH0.SAUfUEMG_dIlpMLusygEQcMXJEHt89v92VncUc1xXOo
```

新しいトークンを生成:
```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
node -e "const jwt = require('jsonwebtoken'); const secret = 'wgT0+Gp9eJn0wRCJuNakZ9PWhYnGTJ2UPCe63Xbq0aE='; const email = 'test@example.com'; const token = jwt.sign({ email }, secret, { expiresIn: '15m' }); console.log('https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=' + token);"
```

## 📁 生成されたファイル

1. **`/Users/suguruhirayama/Chrome_to_Medical/docs/FUNCTION_APP_REBUILD_COMPLETE.md`**
   - 詳細な再構築レポート

2. **`/Users/suguruhirayama/Chrome_to_Medical/docs/AZURE_PORTAL_DIRECT_CHECK.md`**
   - Azureポータルでの確認手順

3. **`/Users/suguruhirayama/Chrome_to_Medical/scripts/restore-env-vars.sh`**
   - 環境変数復元スクリプト

4. **`/Users/suguruhirayama/Chrome_to_Medical/backup-env-vars.json`**
   - 環境変数バックアップ（JSON）

5. **`/Users/suguruhirayama/Chrome_to_Medical/backup-env-vars.txt`**
   - 環境変数バックアップ（テキスト）

## 🔧 代替案

もしAzureポータルでの確認でも問題が解決しない場合:

### オプション1: App Service Planに移行
Consumption PlanではなくApp Service Planを使用して、より安定した動作を確保

### オプション2: リモートビルド
```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote
```

### オプション3: リソースグループごと再作成
すべてのリソースをゼロから作り直す

---

## 📞 次のステップ

**ユーザーにお願い:**
1. `docs/AZURE_PORTAL_DIRECT_CHECK.md`の手順に従ってAzureポータルで確認
2. 確認結果を報告してください:
   - Log streamに何が表示されたか
   - デプロイされたコードは最新か
   - 環境変数は正しく設定されているか
   - 手動テストの結果はどうか

その結果を元に、次の対策を決定します。

---

生成日時: 2025-11-30 11:08 JST


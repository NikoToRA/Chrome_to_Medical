# メール送信設定ガイド

**作成日**: 2025-11-29

---

## 🔍 現在の状況

メール送信ログは出ているが、メールが届いていない。

### 確認した環境変数

- `SENDGRID_API_KEY`: 設定されていない（空）
- `EMAIL_SENDER_ADDRESS`: 設定されていない
- `AZURE_COMMUNICATION_CONNECTION_STRING`: 設定されていない

---

## 📧 メール送信の仕組み

現在の実装では、以下の順序でメール送信を試みます：

1. **Azure Communication Services (ACS)** - 優先
   - `AZURE_COMMUNICATION_CONNECTION_STRING` が必要
   - `EMAIL_SENDER_ADDRESS` が必要

2. **SendGrid** - フォールバック
   - `SENDGRID_API_KEY` が必要

3. **ログ出力のみ** - どちらも設定されていない場合
   - メールは送信されず、ログにMagic Linkが出力される

---

## 🔧 設定方法

### オプション1: Azure Communication Services (推奨)

1. **Azure Communication Services リソースを作成**
   ```bash
   az communication create \
     --name acs-karte-ai \
     --resource-group rg-karte-ai \
     --data-location japan
   ```

2. **接続文字列を取得**
   ```bash
   az communication list-key \
     --name acs-karte-ai \
     --resource-group rg-karte-ai
   ```

3. **環境変数を設定**
   ```bash
   az functionapp config appsettings set \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --settings \
       AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://..." \
       EMAIL_SENDER_ADDRESS="DoNotReply@<verified-domain>"
   ```

4. **ドメインを検証**
   - Azure Portal > Communication Services > Email > Domains
   - ドメインを追加して検証

### オプション2: SendGrid

1. **SendGridアカウントを作成**
   - https://sendgrid.com/ でアカウント作成

2. **APIキーを生成**
   - SendGrid Dashboard > Settings > API Keys
   - "Create API Key" をクリック
   - 権限: "Full Access" または "Mail Send"

3. **環境変数を設定**
   ```bash
   az functionapp config appsettings set \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --settings SENDGRID_API_KEY="SG.xxxxx"
   ```

4. **送信者アドレスを検証**
   - SendGrid Dashboard > Settings > Sender Authentication
   - Single Sender Verification または Domain Authentication

---

## 🧪 テスト方法

### 1. 環境変数の確認

```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='EMAIL_SENDER_ADDRESS' || name=='SENDGRID_API_KEY' || name=='AZURE_COMMUNICATION_CONNECTION_STRING'].{name:name, value:value}" \
  -o table
```

### 2. Application Insightsでログを確認

```bash
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and message contains 'email' or message contains 'send' | order by timestamp desc | take 20"
```

### 3. 実際にメール送信をテスト

LPフォームから送信して、メールが届くか確認

---

## ⚠️ 現在の動作

環境変数が設定されていない場合：

- `auth-send-magic-link` は成功レスポンス（200）を返す
- しかし、実際にはメールは送信されない
- ログにMagic Linkが出力されるのみ

**開発環境での確認方法**:
- Application Insightsのログで `[auth-send-magic-link] Email not configured. Magic Link:` を確認
- ログに出力されたMagic Linkを直接使用してテスト可能

---

## 📝 次のステップ

1. メール送信サービスを選択（ACS または SendGrid）
2. 環境変数を設定
3. ドメイン/送信者アドレスを検証
4. テスト送信を実行
5. メールが届くことを確認



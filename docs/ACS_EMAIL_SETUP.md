# Azure Communication Services メール送信設定ガイド

**作成日**: 2025-11-29

---

## 📋 概要

Azure Communication Services (ACS) を使用してメール送信を設定する手順です。

---

## 🎯 必要なもの

1. Azure サブスクリプション
2. 送信元メールアドレス（検証済みドメインまたは単一送信者アドレス）

---

## 📝 ステップ1: Communication Services リソースを作成

### Azure Portalで作成

1. **Azure Portal** にログイン: https://portal.azure.com

2. **リソースの作成** をクリック

3. **Communication Services** を検索

4. **作成** をクリック

5. 以下の情報を入力:
   - **サブスクリプション**: 使用するサブスクリプションを選択
   - **リソースグループ**: `rg-karte-ai` を選択（既存）
   - **リソース名**: `acs-karte-ai` （任意の名前）
   - **データの場所**: `Japan` を選択
   - **タグ**: 必要に応じて設定

6. **確認および作成** → **作成** をクリック

### Azure CLIで作成（オプション）

```bash
az communication create \
  --name acs-karte-ai \
  --resource-group rg-karte-ai \
  --data-location japan
```

---

## 📝 ステップ2: 接続文字列を取得

### Azure Portalで取得

1. **Communication Services** リソースに移動
2. 左メニューから **キー** を選択
3. **接続文字列** をコピー
   - 形式: `endpoint=https://xxx.communication.azure.com/;accesskey=xxx`

### Azure CLIで取得

```bash
az communication list-key \
  --name acs-karte-ai \
  --resource-group rg-karte-ai \
  --query "connectionString" -o tsv
```

---

## 📝 ステップ3: Email Service リソースを作成

**重要**: Azure Communication Servicesでメール送信するには、**Email Service**という別のリソースが必要です。

### Email Service リソースを作成

1. **Azure Portal** で **リソースの作成** をクリック
2. **「Email Service」** を検索
3. **作成** をクリック
4. 以下の情報を入力:
   - **サブスクリプション**: 使用するサブスクリプションを選択
   - **リソースグループ**: `rg-karte-ai` を選択
   - **リソース名**: `email-karte-ai` （任意の名前）
   - **リージョン**: `Japan East` を選択
5. **確認および作成** → **作成** をクリック

### Azure CLIで作成（オプション）

```bash
az communication email-service create \
  --name email-karte-ai \
  --resource-group rg-karte-ai \
  --location japaneast
```

---

## 📝 ステップ4: 送信者アドレスを検証

### 方法A: 単一送信者アドレス認証（簡単・推奨）

1. **Email Service** リソース（`email-karte-ai`）に移動
2. 左メニューから **送信者ドメイン** を選択
3. **+ 送信者ドメインの追加** をクリック
4. **単一送信者アドレス** を選択
5. メールアドレスを入力（例: `noreply@yourdomain.com`）
   - **重要**: このメールアドレスは実際に受信できるアドレスである必要があります
6. **追加** をクリック
7. 指定したメールアドレスに確認メールが送信されます
8. メールボックスを確認して、確認メール内のリンクをクリック
9. 認証が完了すると、送信者アドレスが「検証済み」になります

### 方法B: ドメイン認証（本番環境向け）

1. **Email Service** リソースに移動
2. 左メニューから **送信者ドメイン** を選択
3. **+ 送信者ドメインの追加** をクリック
4. **ドメイン** を選択
5. ドメイン名を入力（例: `yourdomain.com`）
6. DNSレコードを追加:
   - Azure Portalに表示されるDNSレコードをコピー
   - ドメインのDNS設定に追加（TXTレコード、MXレコードなど）
7. **検証** をクリックして検証

---

## 📝 ステップ5: Communication Services に Email Service を接続

1. **Communication Services** リソース（`acs-karte-ai`）に移動
2. 左メニューから **Email** → **Try Email** を選択
3. 右側の **「Connect email domains」** パネルで:
   - **Subscription**: サブスクリプションを選択
   - **Resource Group**: `rg-karte-ai` を選択
   - **Email Service**: 作成した `email-karte-ai` を選択
   - **Verified Domain**: 検証済みのドメインまたは送信者アドレスを選択
4. **接続** をクリック（または自動的に接続される場合があります）

**注意**: Email ServiceとCommunication Servicesは同じリソースグループにある必要があります。

---

## 📝 ステップ6: 環境変数を設定

### Azure Portalで設定

1. **Function App** (`func-karte-ai-1763705952`) に移動
2. 左メニューから **設定** → **構成** を選択
3. **+ 新しいアプリケーション設定** をクリック

4. 以下の2つの環境変数を追加:

   **設定1: 接続文字列**
   - **名前**: `AZURE_COMMUNICATION_CONNECTION_STRING`
   - **値**: ステップ2で取得した接続文字列
   - **保存** をクリック

   **設定2: 送信者アドレス**
   - **名前**: `EMAIL_SENDER_ADDRESS`
   - **値**: 検証済みのメールアドレス（例: `noreply@yourdomain.com` または `DoNotReply@verified-domain.com`）
   - **保存** をクリック

### Azure CLIで設定

```bash
# 接続文字列を設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://xxx.communication.azure.com/;accesskey=xxx"

# 送信者アドレスを設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings EMAIL_SENDER_ADDRESS="noreply@yourdomain.com"
```

**注意**: 接続文字列と送信者アドレスは実際の値に置き換えてください。

---

## 📝 ステップ7: Function Appを再起動

環境変数を変更した後、Function Appを再起動する必要があります。

### Azure Portalで再起動

1. **Function App** に移動
2. **概要** を選択
3. **再起動** をクリック

### Azure CLIで再起動

```bash
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

## 🧪 ステップ8: テスト

### 1. 環境変数の確認

```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING' || name=='EMAIL_SENDER_ADDRESS'].{name:name, value:value}" \
  -o table
```

**期待される結果**:
```
Name                                    Value
--------------------------------------  ------------------------------------------
AZURE_COMMUNICATION_CONNECTION_STRING   endpoint=https://xxx.communication.azure.com/;accesskey=xxx
EMAIL_SENDER_ADDRESS                    noreply@yourdomain.com
```

### 2. 実際にメール送信をテスト

1. ランディングページにアクセス
2. フォームに入力して送信
3. メールボックスを確認
4. メールが届いているか確認

### 3. Application Insightsでログを確認

```bash
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and message contains 'email' or message contains 'send' | order by timestamp desc | take 10"
```

---

## ⚠️ よくある問題

### 問題1: メールが届かない

**確認事項**:
- 環境変数が正しく設定されているか
- 送信者アドレスが検証されているか
- Function Appが再起動されているか
- 迷惑メールフォルダを確認

**解決方法**:
- Application Insightsでエラーログを確認
- 送信者アドレスの検証状態を確認

### 問題2: "Email client not configured" エラー

**原因**: `AZURE_COMMUNICATION_CONNECTION_STRING` または `EMAIL_SENDER_ADDRESS` が設定されていない

**解決方法**:
- 環境変数を再確認
- Function Appを再起動

### 問題3: ドメイン検証が失敗する

**確認事項**:
- DNSレコードが正しく設定されているか
- DNSの反映に時間がかかる場合がある（最大48時間）

**解決方法**:
- DNS設定を再確認
- しばらく待ってから再度検証

---

## 📊 料金

Azure Communication Services のメール送信料金:
- **無料枠**: 月間5,000通まで無料
- **従量課金**: 5,000通を超えると従量課金

詳細: https://azure.microsoft.com/pricing/details/communication-services/

---

## 🔗 参考リンク

- [Azure Communication Services ドキュメント](https://learn.microsoft.com/azure/communication-services/)
- [Email サービスの概要](https://learn.microsoft.com/azure/communication-services/concepts/email/email-overview)
- [ドメイン認証の設定](https://learn.microsoft.com/azure/communication-services/concepts/email/domain-verification)

---

## 📝 次のステップ

1. Communication Services リソースを作成
2. 接続文字列を取得
3. ドメインまたは送信者アドレスを検証
4. 環境変数を設定
5. Function Appを再起動
6. テスト送信を実行


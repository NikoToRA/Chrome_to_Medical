# Azure Communication Services メール設定 - 簡単ガイド

**作成日**: 2025-11-29

---

## 🎯 現在の画面での手順

Azure Portalで「Try Email」ページを開いている場合の手順です。

---

## 📝 手順

### ステップ1: Email Service リソースを作成

現在の画面の右側に「Connect email domains」パネルがあります。

1. **「Add an email service」** リンクをクリック
   - または、Azure Portalのトップで「Email Service」を検索して作成

2. 以下の情報を入力:
   - **リソースグループ**: `rg-karte-ai`
   - **リソース名**: `email-karte-ai`（任意）
   - **リージョン**: `Japan East`

3. **作成** をクリック

### ステップ2: 送信者アドレスを検証

1. 作成した **Email Service** リソース（`email-karte-ai`）に移動

2. 左メニューから **送信者ドメイン** を選択

3. **+ 送信者ドメインの追加** をクリック

4. **単一送信者アドレス** を選択

5. メールアドレスを入力（例: `noreply@yourdomain.com`）
   - **重要**: このメールアドレスは実際に受信できるアドレスである必要があります
   - テスト用なら、自分のGmailアドレスなどでも可能

6. **追加** をクリック

7. 指定したメールアドレスに確認メールが届きます

8. メール内のリンクをクリックして認証

9. 認証が完了すると、送信者アドレスが「検証済み」になります

### ステップ3: Communication Services に接続

1. **Communication Services** リソース（`acs-karte-ai`）に戻る

2. 左メニューから **Email** → **Try Email** を選択

3. 右側の **「Connect email domains」** パネルで:
   - **Subscription**: サブスクリプションを選択
   - **Resource Group**: `rg-karte-ai` を選択
   - **Email Service**: `email-karte-ai` を選択
   - **Verified Domain**: 検証済みの送信者アドレスを選択

4. 接続が完了すると、左側の「Send an email message」フォームでメール送信が可能になります

### ステップ4: テスト送信

1. **「Send an email message」** フォームで:
   - **Send email from**: 検証済みのドメインを選択
   - **Sender email username**: 検証済みのメールアドレスを入力
   - **Recipient email address**: テスト用のメールアドレス（例: `super206cc@gmail.com`）
   - **Subject**: テスト件名
   - **Body**: テスト本文

2. **Send** をクリック

3. メールが届くことを確認

### ステップ5: 環境変数を設定

テスト送信が成功したら、Function Appに環境変数を設定します。

1. **接続文字列を取得**:
   - Communication Services リソース → **キー** → **接続文字列** をコピー

2. **環境変数を設定**:

```bash
# 接続文字列を設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://xxx.communication.azure.com/;accesskey=xxx"

# 送信者アドレスを設定（検証済みのメールアドレス）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings EMAIL_SENDER_ADDRESS="noreply@yourdomain.com"
```

3. **Function Appを再起動**:

```bash
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

## ⚠️ 重要なポイント

1. **Email Service リソースが必要**: Communication Servicesだけではメール送信できません
2. **送信者アドレスの検証が必要**: 未検証のアドレスからは送信できません
3. **同じリソースグループ**: Email ServiceとCommunication Servicesは同じリソースグループにある必要があります

---

## 🧪 確認方法

### 環境変数の確認

```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING' || name=='EMAIL_SENDER_ADDRESS'].{name:name, value:value}" \
  -o table
```

### 実際のテスト

1. ランディングページにアクセス
2. フォームに入力して送信
3. メールボックスを確認

---

## 📝 次のステップ

1. ✅ Email Service リソースを作成
2. ✅ 送信者アドレスを検証
3. ✅ Communication Services に接続
4. ✅ テスト送信を実行
5. ✅ 環境変数を設定
6. ✅ Function Appを再起動
7. ✅ 実際のメール送信をテスト


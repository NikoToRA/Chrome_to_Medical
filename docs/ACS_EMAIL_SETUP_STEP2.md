# Step2: 送信者アドレスの設定方法

**作成日**: 2025-11-29

---

## 🎯 現在の状況

- ✅ Email Service リソース（`email-karte-ai`）が作成済み
- ✅ Azure subdomainが検証済み（`56e74c6e-f57a-4dfe-9bfc-b6a2157f...`）

---

## 📝 送信者アドレスの設定方法

Azure subdomainが検証済みの場合、そのドメインのメールアドレスを送信者アドレスとして使用できます。

### 方法1: 検証済みドメインのメールアドレスを使用

検証済みのAzure subdomain（`56e74c6e-f57a-4dfe-9bfc-b6a2157f...`）を使用して、以下の形式のメールアドレスを送信者アドレスとして設定できます：

```
noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net
```

**注意**: Azure subdomainの完全なドメイン名を確認する必要があります。

### 方法2: 左メニューを確認

Email Serviceリソースの左メニューで、以下の項目を確認してください：

1. **「送信者アドレス」** または **「Sender addresses」** というメニューがあるか確認
2. **「Email addresses」** というメニューがあるか確認
3. **「Settings」** セクションを展開して、関連メニューを確認

### 方法3: 直接テスト送信を試す

検証済みドメインがあるので、直接テスト送信を試すことができます：

1. **Communication Services** リソース（`acs-karte-ai`）に移動
2. 左メニューから **Email** → **Try Email** を選択
3. **「Send an email message」** フォームで:
   - **Send email from**: 検証済みのドメインを選択
   - **Sender email username**: `noreply` など（ドメイン部分は自動入力される）
   - **Recipient email address**: テスト用のメールアドレス
   - **Subject**: テスト件名
   - **Body**: テスト本文
4. **Send** をクリック

これで送信できる場合、その送信者アドレスを環境変数に設定します。

---

## 🔍 ドメイン名の確認方法

現在の画面で表示されているドメイン名（`56e74c6e-f57a-4dfe-9bfc-b6a2157f...`）をクリックすると、詳細情報が表示される可能性があります。

または、以下のコマンドで確認：

```bash
az communication email-service domain list \
  --email-service-name email-karte-ai \
  --resource-group rg-karte-ai \
  --query "[].{domain:domainName, status:domainStatus}" \
  -o table
```

---

## 📝 環境変数の設定

送信者アドレスが分かったら、環境変数を設定します：

```bash
# 送信者アドレスを設定（実際のドメイン名に置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings EMAIL_SENDER_ADDRESS="noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net"
```

---

## 🧪 次のステップ

1. 検証済みドメインの完全なドメイン名を確認
2. Communication Services の「Try Email」でテスト送信
3. 送信者アドレスを環境変数に設定
4. Function Appを再起動
5. 実際のメール送信をテスト


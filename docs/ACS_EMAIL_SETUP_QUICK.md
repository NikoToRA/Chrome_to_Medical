# Azure Communication Services メール設定 - クイックガイド

**作成日**: 2025-11-29

---

## 🎯 現在の状況

- ✅ Email Service リソースを作成済み
- ✅ Azure subdomainを検証済み
- ✅ 「Try Email」でテスト送信成功
- ✅ 送信者アドレスを確認済み: `DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net`

---

## 📝 次のステップ（3ステップ）

### ステップ1: 接続文字列を取得

1. **Azure Portal** で **Communication Services** リソース（`acs-karte-ai`）に移動
2. 左メニューから **キー** を選択
3. **接続文字列** をコピー
   - 形式: `endpoint=https://xxx.communication.azure.com/;accesskey=xxx`

---

### ステップ2: 環境変数を設定

#### 方法A: スクリプトを使用（推奨）

```bash
./scripts/setup-acs-email-simple.sh
```

スクリプトが以下を実行します：
1. 接続文字列の入力を求めます（ステップ1で取得したものを貼り付け）
2. 送信者アドレスを確認します（デフォルト値が提案されます）
3. 環境変数を設定します
4. Function Appを再起動します

#### 方法B: Azure CLIで直接設定

接続文字列を取得したら、以下のコマンドを実行してください：

```bash
# 接続文字列を設定（実際の値に置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://xxx.communication.azure.com/;accesskey=xxx"

# 送信者アドレスを設定（画面から確認した値）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings EMAIL_SENDER_ADDRESS="DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net"

# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### ステップ3: 設定を確認

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
EMAIL_SENDER_ADDRESS                     DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net
```

---

## 🧪 テスト

1. **ランディングページ** にアクセス:
   ```
   https://stkarteai1763705952.z11.web.core.windows.net
   ```

2. **フォームに入力** して送信

3. **メールボックスを確認**

4. **メールが届いていることを確認**

---

## 📋 チェックリスト

- [ ] 接続文字列を取得（Azure Portal > Communication Services > キー）
- [ ] 環境変数を設定（スクリプトまたはAzure CLI）
- [ ] Function Appを再起動
- [ ] 設定を確認
- [ ] ランディングページでテスト送信
- [ ] メールが届くことを確認

---

## 🚀 すぐに実行

接続文字列を取得したら、以下を実行してください：

```bash
./scripts/setup-acs-email-simple.sh
```

スクリプトが対話的に設定を進めます。


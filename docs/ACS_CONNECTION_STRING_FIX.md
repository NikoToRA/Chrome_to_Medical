# Azure Communication Services 接続文字列の修正

**作成日**: 2025-11-29

---

## 🔍 問題

`AZURE_COMMUNICATION_CONNECTION_STRING` に **Application Insights の接続文字列**が設定されています。

**現在の値（間違い）**:
```
InstrumentationKey=33decda4-fb54-45c6-809a-0346e73d7439;IngestionEndpoint=...
```

**正しい値（必要）**:
```
endpoint=https://xxx.communication.azure.com/;accesskey=xxx
```

---

## 🔧 修正方法

### ステップ1: 正しい接続文字列を取得

1. **Azure Portal** で **Communication Services** リソース（`acs-karte-ai`）に移動
2. 左メニューから **キー** を選択
3. **接続文字列** をコピー
   - ⚠️ **重要**: 「接続文字列」をコピーしてください
   - 「主キー」や「セカンダリキー」ではありません
   - 形式: `endpoint=https://xxx.communication.azure.com/;accesskey=xxx`

### ステップ2: 接続文字列を修正

#### 方法A: スクリプトを使用（推奨）

```bash
./scripts/fix-acs-connection-string.sh
```

スクリプトが以下を実行します：
1. 正しい接続文字列の入力を求めます
2. 接続文字列を更新します
3. Function Appを再起動します

#### 方法B: Azure CLIで直接修正

接続文字列を取得したら、以下のコマンドを実行してください：

```bash
# 接続文字列を修正（実際の値に置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://xxx.communication.azure.com/;accesskey=xxx"

# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

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

**確認ポイント**:
- `AZURE_COMMUNICATION_CONNECTION_STRING` が `endpoint=https://` で始まっていること
- `accesskey=` が含まれていること
- `InstrumentationKey` が含まれていないこと

---

## 🧪 テスト

1. **ランディングページ** にアクセス
2. **フォームに入力** して送信
3. **メールボックスを確認**
4. **メールが届いていることを確認**

---

## ⚠️ よくある間違い

### 間違い1: Application Insights の接続文字列を使用

**症状**: `InstrumentationKey=...` が含まれている

**解決方法**: Communication Services の「キー」から「接続文字列」を取得

### 間違い2: 主キーやセカンダリキーを使用

**症状**: 接続文字列の形式が正しくない

**解決方法**: 「接続文字列」をコピーしてください（「主キー」や「セカンダリキー」ではありません）

---

## 📝 次のステップ

接続文字列を修正したら：

1. Function Appを再起動
2. ランディングページでテスト送信
3. メールが届くことを確認



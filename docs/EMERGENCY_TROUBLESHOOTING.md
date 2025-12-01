# 緊急トラブルシューティング - Magic Linkが動作しない

**状況**: Magic Linkをクリックしてもサイトが表示されない

---

## 🚨 緊急確認手順

### 1. Function Appが起動しているか確認

```bash
az functionapp show \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "{name:name, state:state}" \
  --output table
```

**期待される結果**: `state: Running`

---

### 2. auth-verify-tokenが応答するか確認

```bash
curl -i "https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=test"
```

**期待される結果**: 
- HTTP 401（トークンが無効）または
- HTTP 500（エラー）または
- HTML（エラーページ）

**応答がない場合**: Function Appが起動していない可能性

---

### 3. Azure Portalで直接確認

#### 方法1: Function Appの概要を確認

1. Azure Portal → Function App (`func-karte-ai-1763705952`)
2. **概要**タブを確認
3. **状態**が「**実行中**」になっているか確認

#### 方法2: 関数の実行履歴を確認

1. Azure Portal → Function App → **Functions**
2. **auth-verify-token**をクリック
3. **モニター**タブをクリック
4. 最近の実行履歴を確認

---

## 🔧 問題別の対処法

### 問題1: Function Appが停止している

**確認方法**:
```bash
az functionapp show \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "state" \
  --output tsv
```

**対処法**:
```bash
az functionapp start \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### 問題2: 関数が応答しない

**確認方法**:
```bash
curl -i "https://func-karte-ai-1763705952.azurewebsites.net/api/auth-send-magic-link" \
  -X OPTIONS
```

**対処法**:
```bash
# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### 問題3: 環境変数が設定されていない

**確認方法**:
```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='JWT_SECRET' || name=='STRIPE_SECRET_KEY'].{Name:name, Value:value}" \
  --output table
```

**対処法**: 環境変数が空の場合は設定

---

### 問題4: デプロイが失敗している

**確認方法**:
```bash
# 最新のデプロイ状態を確認
az functionapp deployment list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --output table
```

**対処法**: 再デプロイ
```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote
```

---

## 🎯 最も確実な解決方法

すべてを一度リセットする：

```bash
# 1. Function Appを停止
az functionapp stop \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai

# 2. 再デプロイ
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote

# 3. Function Appを起動
az functionapp start \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai

# 4. 数分待つ

# 5. 新しいMagic Linkでテスト
```

---

## 📝 診断スクリプト

```bash
#!/bin/bash

echo "=== Function App診断 ==="

# Function Appの状態
echo "1. Function Appの状態:"
az functionapp show \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "{name:name, state:state}" \
  --output table

echo ""
echo "2. auth-verify-tokenの応答確認:"
curl -i "https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=test" 2>&1 | head -10

echo ""
echo "3. 環境変数の確認:"
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='JWT_SECRET' || name=='STRIPE_SECRET_KEY'].{Name:name, HasValue:value!=''}" \
  --output table

echo ""
echo "診断完了"
```

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30


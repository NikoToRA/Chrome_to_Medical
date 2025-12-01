# Azure Communication Services メール設定 - 次のステップ

**作成日**: 2025-11-29

---

## ✅ 完了したこと

- Email Service リソースを作成
- Azure subdomainを検証
- Communication Services の「Try Email」でテスト送信成功

---

## 📝 次のステップ（詳細）

### ステップ1: 送信者アドレスを確認

「Try Email」で使用した送信者アドレスを確認してください。

**確認方法**:
- 「Try Email」フォームで使用した **Sender email username** と **Send email from** のドメインを組み合わせた完全なメールアドレス
- 例: `noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net`

この送信者アドレスをメモしてください。

---

### ステップ2: 接続文字列を取得

1. **Communication Services** リソース（`acs-karte-ai`）に移動
2. 左メニューから **キー** を選択
3. **接続文字列** をコピー
   - 形式: `endpoint=https://xxx.communication.azure.com/;accesskey=xxx`

---

### ステップ3: 環境変数を設定

#### 方法A: Azure Portalで設定

1. **Function App** (`func-karte-ai-1763705952`) に移動
2. 左メニューから **設定** → **構成** を選択
3. **+ 新しいアプリケーション設定** をクリック

4. **設定1: 接続文字列**
   - **名前**: `AZURE_COMMUNICATION_CONNECTION_STRING`
   - **値**: ステップ2で取得した接続文字列を貼り付け
   - **保存** をクリック

5. **設定2: 送信者アドレス**
   - **名前**: `EMAIL_SENDER_ADDRESS`
   - **値**: ステップ1で確認した送信者アドレス（例: `noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net`）
   - **保存** をクリック

#### 方法B: Azure CLIで設定

```bash
# 接続文字列を設定（実際の値に置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://xxx.communication.azure.com/;accesskey=xxx"

# 送信者アドレスを設定（実際の送信者アドレスに置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings EMAIL_SENDER_ADDRESS="noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net"
```

**重要**: 
- 接続文字列と送信者アドレスは、実際の値に置き換えてください
- 送信者アドレスは、「Try Email」で使用したものと同じである必要があります

---

### ステップ4: Function Appを再起動

環境変数を変更した後、Function Appを再起動する必要があります。

#### Azure Portalで再起動

1. **Function App** に移動
2. **概要** を選択
3. **再起動** をクリック
4. 確認ダイアログで **はい** をクリック

#### Azure CLIで再起動

```bash
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### ステップ5: 環境変数の確認

設定が正しく反映されているか確認します。

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
EMAIL_SENDER_ADDRESS                    noreply@56e74c6e-f57a-4dfe-9bfc-b6a2157f...azurecomm.net
```

---

### ステップ6: 実際のメール送信をテスト

1. **ランディングページ** にアクセス:
   ```
   https://stkarteai1763705952.z11.web.core.windows.net
   ```

2. **フォームに入力**:
   - お名前
   - 医療機関名
   - 住所
   - 電話番号
   - メールアドレス（実際に受信できるアドレス）

3. **「無料で登録する」ボタンをクリック**

4. **成功メッセージが表示される**ことを確認

5. **メールボックスを確認**:
   - 指定したメールアドレスにメールが届いているか確認
   - 迷惑メールフォルダも確認

6. **メールの内容を確認**:
   - 日本語のメールが届いているか
   - Magic Linkが含まれているか
   - リンクをクリックできるか

---

### ステップ7: Application Insightsでログを確認（オプション）

メールが届かない場合、ログを確認します。

```bash
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and (message contains 'email' or message contains 'send' or message contains 'auth-send-magic-link') | order by timestamp desc | take 20"
```

---

## ⚠️ トラブルシューティング

### メールが届かない場合

1. **環境変数が正しく設定されているか確認**
   ```bash
   az functionapp config appsettings list \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING' || name=='EMAIL_SENDER_ADDRESS'].{name:name, value:value}" \
     -o table
   ```

2. **Function Appが再起動されているか確認**
   - 環境変数を設定した後、必ず再起動してください

3. **送信者アドレスが正しいか確認**
   - 「Try Email」で使用した送信者アドレスと同じである必要があります

4. **Application Insightsでエラーログを確認**
   - エラーメッセージを確認して、問題を特定

5. **迷惑メールフォルダを確認**
   - メールが迷惑メールフォルダに振り分けられている可能性があります

---

## 📋 チェックリスト

- [ ] 送信者アドレスを確認
- [ ] 接続文字列を取得
- [ ] 環境変数 `AZURE_COMMUNICATION_CONNECTION_STRING` を設定
- [ ] 環境変数 `EMAIL_SENDER_ADDRESS` を設定
- [ ] Function Appを再起動
- [ ] 環境変数が正しく設定されているか確認
- [ ] ランディングページでテスト送信
- [ ] メールが届くことを確認
- [ ] メールの内容を確認
- [ ] Magic Linkが動作することを確認

---

## 🎯 完了後の次のステップ

メール送信が成功したら：

1. **Magic Linkクリック時の処理**を実装
   - `auth-verify-token` でStripe Checkoutに自動リダイレクト
2. **Stripe Checkout完了後の処理**を実装
   - 成功ページへのリダイレクト
   - 拡張機能への自動ログイン

---

## 📝 参考

- [ACS_EMAIL_SETUP.md](./ACS_EMAIL_SETUP.md) - 詳細な設定ガイド
- [ACS_EMAIL_SETUP_SIMPLE.md](./ACS_EMAIL_SETUP_SIMPLE.md) - 簡単ガイド


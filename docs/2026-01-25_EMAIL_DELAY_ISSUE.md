# メール遅延問題の調査と解決方法

**作成日**: 2026-01-25
**ステータス**: 解決済み（2026-01-26 完了）

## 問題の概要

LP（ランディングページ）や Chrome 拡張機能から Magic Link（ログイン用リンク）を送信した際、メールが届くまでに **5〜10分の遅延** が発生。以前は即座に届いていた。

## 症状

1. LP/拡張機能で「メールを送信しました」と表示される
2. API は正常に `{"message": "Magic link sent"}` を返す
3. しかし、実際にメールが届くまでに 5〜10分かかる
4. ユーザーはレート制限（5分間再送信不可）のため再送信もできず不安になる

## 調査結果

### 原因の特定

| 調査項目 | 結果 |
|---------|------|
| LP のコード | 正常 |
| Chrome 拡張機能のコード | 正常 |
| API エンドポイント | 正常（APIM 経由） |
| Azure Function | 正常（即座にレスポンス返却） |
| Azure Communication Services (ACS) | 送信成功（即座に完了報告） |
| **Gmail 側** | **遅延の原因** |

### 根本原因

Gmail がメールを受信した際、以下の警告が表示されていた：

> 「このメールにはご注意ください。このメールは、迷惑メール、未確認の送信者、有害なソフトウェアに関するスキャンが行われていません。」

**原因**: ACS のデフォルト送信ドメイン（`azurecomm.net`）が Gmail で信頼されていないため、追加のセキュリティスキャンが実行され、配信が遅延していた。

### 時系列での確認

| 時刻 | イベント |
|------|---------|
| 0:23:44 | API で Magic Link 送信（curl 直接） |
| 0:23 | Gmail での受信時刻（メールヘッダー上） |
| 0:32 | 実際にユーザーの受信箱に表示 |

→ ACS は即座に送信完了しているが、**Gmail 側で約9分の遅延処理**が発生

## 解決策

### カスタムドメインでのメール送信

ACS のデフォルトドメインではなく、自社ドメイン（`wonder-drill.com`）からメールを送信することで、Gmail の信頼度を上げ、遅延を解消する。

### 必要な DNS レコード設定

Azure Communication Services でカスタムドメインを追加した際に生成された DNS レコード：

```
【1】TXTレコード（ドメイン所有権確認）
  ホスト名: @（ルート）
  種類: TXT
  TTL: 3600
  値: ms-domain-verification=c43c4843-1306-4058-820b-9c854499ebc6

【2】CNAMEレコード（DKIM署名 その1）
  ホスト名: selector1-azurecomm-prod-net._domainkey
  種類: CNAME
  TTL: 3600
  値: selector1-azurecomm-prod-net._domainkey.azurecomm.net

【3】CNAMEレコード（DKIM署名 その2）
  ホスト名: selector2-azurecomm-prod-net._domainkey
  種類: CNAME
  TTL: 3600
  値: selector2-azurecomm-prod-net._domainkey.azurecomm.net

【4】TXTレコード（SPF設定）
  ホスト名: @（ルート）
  種類: TXT
  TTL: 3600
  値: v=spf1 include:spf.protection.outlook.com -all
```

### 対応状況

- [x] Azure Communication Services にカスタムドメイン追加（2026-01-25）
- [x] DNS レコード設定（2026-01-26 完了）
- [x] ドメイン検証（Domain, SPF, DKIM, DKIM2 全て Verified）（2026-01-26 完了）
- [x] 送信元メールアドレス作成（`noreply@wonder-drill.com`）（2026-01-26 完了）
- [x] Azure Function の環境変数更新（`SENDER_EMAIL_ADDRESS`）（2026-01-26 完了）

## DNS 設定完了後の作業

### 1. ドメイン検証

```bash
# 各検証項目を開始
az communication email domain initiate-verification \
  --domain-name "wonder-drill.com" \
  --email-service-name "email-karte-ai" \
  --resource-group "rg-karte-ai" \
  --verification-type "Domain"

az communication email domain initiate-verification \
  --domain-name "wonder-drill.com" \
  --email-service-name "email-karte-ai" \
  --resource-group "rg-karte-ai" \
  --verification-type "SPF"

az communication email domain initiate-verification \
  --domain-name "wonder-drill.com" \
  --email-service-name "email-karte-ai" \
  --resource-group "rg-karte-ai" \
  --verification-type "DKIM"

az communication email domain initiate-verification \
  --domain-name "wonder-drill.com" \
  --email-service-name "email-karte-ai" \
  --resource-group "rg-karte-ai" \
  --verification-type "DKIM2"
```

### 2. 送信元メールアドレス作成

```bash
az communication email domain sender-username create \
  --domain-name "wonder-drill.com" \
  --email-service-name "email-karte-ai" \
  --resource-group "rg-karte-ai" \
  --sender-username "noreply" \
  --display-name "Karte AI+"
```

### 3. Azure Function 環境変数更新

```bash
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings "SENDER_EMAIL_ADDRESS=noreply@wonder-drill.com"
```

## 費用

| 項目 | 料金 |
|------|------|
| カスタムドメイン設定 | 無料 |
| メール送信 | $0.00025/通（約0.04円/通） |

## 関連ファイル

- `/azure-functions/lib/email.js` - メール送信処理
- `/azure-functions/auth-send-magic-link/index.js` - Magic Link 送信 API

## 2026-01-26 追加修正: トークン無効問題

### 症状

メール問題の修正後、新たな問題が発覚：
- 拡張機能でトークンを送信しても「トークン無効」と表示される
- コンソールログに `[ApiClient] Empty response body` が出力される
- サブスクリプションが無効と判定され、認証UIが再表示される

### 原因

APIMのCORSポリシーが Chrome拡張機能のorigin (`chrome-extension://...`) を許可していなかった。

**修正前のCORS設定:**
```xml
<cors allow-credentials="true">
    <allowed-origins>
        <origin>https://stkarteai1763705952.z11.web.core.windows.net</origin>
    </allowed-origins>
</cors>
```

ランディングページのみ許可されており、拡張機能からのリクエストはCORSエラーとなり、ブラウザがレスポンスボディを読み取れなかった。

### 解決策

APIMのCORSポリシーを更新し、全てのoriginを許可：

```xml
<cors allow-credentials="false">
    <allowed-origins>
        <origin>*</origin>
    </allowed-origins>
    <allowed-methods preflight-result-max-age="300">
        <method>GET</method>
        <method>POST</method>
        <method>OPTIONS</method>
    </allowed-methods>
    <allowed-headers>
        <header>*</header>
    </allowed-headers>
</cors>
```

### 修正コマンド

```bash
az rest --method put \
  --url "https://management.azure.com/subscriptions/3bbbad68-26b6-460f-bc43-6a01d6bee9dd/resourceGroups/rg-karte-ai/providers/Microsoft.ApiManagement/service/apim-karte-ai-1763705952/apis/karte-ai-api/policies/policy?api-version=2022-08-01" \
  --body '{"properties": {"format": "xml", "value": "<policies>...</policies>"}}'
```

### 影響範囲

| ユーザー | 修正前の影響 | 修正後 |
|---------|-------------|--------|
| ログイン済み（24時間以内） | キャッシュ使用で影響なし | 影響なし |
| ログイン済み（24時間以上） | API再コールで認証UI表示 | 正常動作 |
| 新規/再ログイン | トークン無効表示 | 正常動作 |

## 最終確認結果（2026-01-26）

- ✅ メール送信: `noreply@wonder-drill.com` から即座に到達
- ✅ ドメイン検証: Domain, SPF, DKIM, DKIM2 全てVerified
- ✅ トークン認証: 正常動作
- ✅ 既存ユーザー: 影響なし
- ✅ 新規ユーザー: 正常動作

## 参考

- [Azure Communication Services - Email Domains](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains)
- [Gmail のメール認証](https://support.google.com/a/answer/174124)
- [Azure APIM - CORS Policy](https://learn.microsoft.com/en-us/azure/api-management/cors-policy)

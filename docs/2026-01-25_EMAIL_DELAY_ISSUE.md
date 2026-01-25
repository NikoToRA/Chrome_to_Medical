# メール遅延問題の調査と解決方法

**作成日**: 2026-01-25
**ステータス**: 対応中（DNS設定待ち）

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
- [ ] DNS レコード設定（業者に依頼済み、返答待ち）
- [ ] ドメイン検証
- [ ] 送信元メールアドレス作成（`noreply@wonder-drill.com`）
- [ ] Azure Function の環境変数更新（`SENDER_EMAIL_ADDRESS`）

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

## 参考

- [Azure Communication Services - Email Domains](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains)
- [Gmail のメール認証](https://support.google.com/a/answer/174124)

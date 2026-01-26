# Karte AI+ API リファレンス

**最終更新**: 2026-01-26
**ベースURL**: `https://func-karte-ai-1763705952.azurewebsites.net/api`

---

## 目次

1. [認証](#認証)
2. [エンドポイント一覧](#エンドポイント一覧)
3. [認証系API](#認証系api)
4. [サブスクリプション系API](#サブスクリプション系api)
5. [AI機能系API](#ai機能系api)
6. [設定・ログ系API](#設定ログ系api)
7. [管理系API](#管理系api)
8. [エラーコード](#エラーコード)

---

## 認証

### Magic Link認証フロー

Karte AI+はパスワードレス認証（Magic Link）を採用しています。

```
1. ユーザーがメールアドレスを入力
2. auth-send-magic-link でワンタイムリンクを送信
3. ユーザーがリンクをクリック
4. auth-verify-token でトークン検証・セッション発行
5. 以降のAPIはセッショントークン（JWT）で認証
```

### JWTトークン

- **Type**: Bearer Token
- **有効期限**: 365日
- **ペイロード**: `{ email, type: "session" }`

#### リクエストヘッダー

```
Authorization: Bearer <session_token>
```

---

## エンドポイント一覧

| エンドポイント | メソッド | 認証 | 説明 |
|---------------|---------|------|------|
| `/health` | GET | 不要 | ヘルスチェック |
| `/auth-send-magic-link` | POST | 不要 | Magic Link送信 |
| `/auth-verify-token` | GET | 不要 | トークン検証 |
| `/check-subscription` | POST | 不要* | サブスクリプション確認 |
| `/create-checkout-session` | POST | 不要 | Stripe決済セッション作成 |
| `/create-portal-session` | POST | 必要 | Stripe顧客ポータル |
| `/cancel-subscription` | POST | 必要 | サブスクリプション解約 |
| `/chat` | POST | 必要 | AI応答生成 |
| `/chat-stream` | POST | 必要 | AI応答ストリーミング |
| `/save-settings` | POST | 必要 | ユーザー設定保存 |
| `/get-settings` | POST | 必要 | ユーザー設定取得 |
| `/save-log` | POST | 必要 | 利用ログ保存 |
| `/stripe-webhook` | POST | Stripe署名 | Webhookハンドラ |

*認証なしでも動作しますが、将来認証必須に変更予定

---

## 認証系API

### POST /auth-send-magic-link

Magic Linkをユーザーのメールアドレスに送信します。

#### リクエスト

```json
{
  "email": "user@example.com"
}
```

#### レスポンス (200)

```json
{
  "message": "Magic link sent successfully",
  "email": "user@example.com"
}
```

#### エラーレスポンス

| ステータス | 説明 |
|-----------|------|
| 400 | メールアドレスが未指定または無効 |
| 429 | レート制限（5回/分） |
| 500 | サーバーエラー |

#### レート制限

- IP単位: 5回/分
- メール単位: 5回/分

---

### GET /auth-verify-token

Magic Linkからのトークンを検証し、セッショントークンを発行します。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| token | string | Yes | Magic Linkから取得したトークン |

#### レスポンス

検証成功時、適切なリダイレクト先にリダイレクトされます。

**新規ユーザー（未課金）**: Stripe Checkoutへリダイレクト
**既存ユーザー（課金済）**: サクセスページへリダイレクト

#### エラーレスポンス

| ステータス | 説明 |
|-----------|------|
| 400 | トークンが未指定 |
| 401 | トークンが無効または期限切れ |
| 500 | サーバーエラー |

---

## サブスクリプション系API

### POST /check-subscription

ユーザーのサブスクリプション状態を確認します。

#### リクエスト

```json
{
  "email": "user@example.com"
}
```

#### レスポンス (200)

```json
{
  "status": "active",
  "isActive": true,
  "plan": "premium",
  "currentPeriodEnd": "2026-02-26T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "trialEnd": null
}
```

#### ステータス値

| ステータス | 説明 |
|-----------|------|
| `active` | アクティブなサブスクリプション |
| `trialing` | トライアル期間中 |
| `canceled` | 解約済み |
| `past_due` | 支払い遅延 |
| `inactive` | 非アクティブ |

---

### POST /create-checkout-session

Stripe決済セッションを作成します。

#### リクエスト

```json
{
  "email": "user@example.com",
  "returnUrl": "https://example.com/success"
}
```

#### レスポンス (200)

```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

リダイレクト先のURLが返されます。クライアントはこのURLにリダイレクトしてください。

---

### POST /create-portal-session

Stripeカスタマーポータルへのリンクを生成します。
ユーザーは支払い方法の変更やサブスクリプションの管理ができます。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

```json
{
  "returnUrl": "https://example.com/settings"
}
```

#### レスポンス (200)

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

---

### POST /cancel-subscription

サブスクリプションを期間終了時に解約予約します。

#### 認証

必須（Authorization: Bearer <token>）

#### レスポンス (200)

```json
{
  "success": true,
  "message": "Subscription cancellation scheduled",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": "2026-02-26T00:00:00.000Z"
}
```

#### エラーレスポンス

| ステータス | 説明 |
|-----------|------|
| 401 | 認証エラー |
| 404 | 有効なサブスクリプションが見つからない |
| 500 | サーバーエラー |

---

## AI機能系API

### POST /chat

AI（Claude）による応答を生成します。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

```json
{
  "messages": [
    {
      "role": "user",
      "content": "SOAPノートを作成してください"
    }
  ],
  "model": "claude-3-sonnet",
  "systemPrompt": "あなたは医療記録作成のアシスタントです。"
}
```

#### レスポンス (200)

```json
{
  "content": "以下にSOAPノートを作成しました...",
  "model": "claude-3-sonnet",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 500,
    "total_tokens": 650
  }
}
```

---

### POST /chat-stream

AI応答をストリーミングで取得します（SSE）。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

`/chat`と同じ形式

#### レスポンス

Server-Sent Events (SSE) 形式でストリーミング

```
data: {"type":"content_block_delta","delta":{"text":"こんにちは"}}

data: {"type":"content_block_delta","delta":{"text":"、診療記録を"}}

data: {"type":"message_stop"}
```

---

## 設定・ログ系API

### POST /save-settings

ユーザー設定を保存します。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

```json
{
  "userId": "user@example.com",
  "settings": {
    "theme": "dark",
    "defaultModel": "claude-3-sonnet",
    "templates": [...]
  }
}
```

#### レスポンス (200)

```json
{
  "success": true
}
```

---

### POST /get-settings

ユーザー設定を取得します。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

```json
{
  "userId": "user@example.com"
}
```

#### レスポンス (200)

```json
{
  "settings": {
    "theme": "dark",
    "defaultModel": "claude-3-sonnet",
    "templates": [...]
  }
}
```

---

### POST /save-log

利用ログを保存します（分析用）。

#### 認証

必須（Authorization: Bearer <token>）

#### リクエスト

```json
{
  "userId": "user@example.com",
  "action": "chat",
  "metadata": {
    "model": "claude-3-sonnet",
    "tokens": 650
  }
}
```

#### レスポンス (200)

```json
{
  "success": true
}
```

---

## 管理系API

### GET /health

サーバーの稼働状態を確認します。

#### レスポンス (200)

```json
{
  "status": "ok"
}
```

---

### POST /stripe-webhook

Stripeからのイベントを処理します。

#### 認証

Stripe署名ヘッダー（`Stripe-Signature`）による検証

#### 処理イベント

| イベント | 処理内容 |
|---------|---------|
| `checkout.session.completed` | サブスクリプション開始処理 |
| `customer.subscription.updated` | サブスクリプション更新 |
| `customer.subscription.deleted` | サブスクリプション終了 |
| `invoice.paid` | 支払い完了 |
| `invoice.payment_failed` | 支払い失敗 |

---

## エラーコード

### 共通エラーレスポンス形式

```json
{
  "error": "エラーメッセージ（日本語）",
  "message": "詳細説明（日本語）"
}
```

### HTTPステータスコード

| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 204 | 成功（レスポンスボディなし） |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限不足 |
| 404 | リソースが見つからない |
| 429 | レート制限 |
| 500 | サーバーエラー |

### レート制限レスポンス

```json
{
  "error": "Too many requests",
  "message": "リクエスト制限に達しました。しばらくしてから再度お試しください。",
  "retryAfter": 45
}
```

---

## CORS

全エンドポイントで以下のCORSヘッダーが設定されています：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 使用例

### cURLでMagic Link送信

```bash
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/auth-send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### JavaScriptでAI応答取得

```javascript
const response = await fetch('https://func-karte-ai-1763705952.azurewebsites.net/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'SOAPノートを作成してください' }],
    systemPrompt: 'あなたは医療記録作成のアシスタントです。'
  })
});

const data = await response.json();
console.log(data.content);
```

---

## 変更履歴

| 日付 | 変更内容 |
|-----|---------|
| 2026-01-26 | 初版作成 |

# 💳 Stripe課金後の動線フロー詳細

**作成日**: 2025-11-30  
**対象**: Stripe決済完了から拡張機能ログインまでの完全な動線

---

## 🎯 全体フロー概要

```
[Landing Page]
    ↓ (メールアドレス入力)
[Magic Link送信]
    ↓ (メール受信)
[Magic Linkクリック]
    ↓
[トークン検証 API]
    ↓
[Stripe Checkout] ← 👈 あなたは今ここ！
    ↓
[決済処理]
    ↓
[Success Page] ⚠️ 未実装の自動ログイン
    ↓
[Chrome拡張機能で手動ログイン] ← 現状はここで止まっている
```

---

## 📍 現在地: Stripe Checkoutページ

### あなたが見ているもの

Stripeの決済画面（テストモード）:
- **Price**: `price_1SWuPcDk83sa02BpcjQQGdXr`
- **Mode**: Subscription（継続課金）
- **14日間無料トライアル**が設定されているはず

### テストカード情報

Stripeのテストモードでは、以下のカード情報を使用できます：

```
カード番号: 4242 4242 4242 4242
有効期限: 任意の未来の日付 (例: 12/25)
CVC: 任意の3桁 (例: 123)
郵便番号: 任意 (例: 123-4567)
```

---

## ✅ Stripe決済完了後の動線

### 1. 決済完了 → Success URLへリダイレクト

**リダイレクト先**:
```
https://stkarteai1763705952.z11.web.core.windows.net/success?token=eyJhbGci...&session_id={CHECKOUT_SESSION_ID}
```

**パラメータ**:
- `token`: JWTトークン（メールアドレスが含まれる）
- `session_id`: Stripe Checkout Session ID

### 2. Stripe Webhookが発火（バックグラウンド）

**タイミング**: 決済完了の数秒後

**処理内容** (`stripe-webhook/index.js`):

```javascript
case 'checkout.session.completed': {
    const session = event.data.object;
    const email = session.customer_details.email;
    
    // Azure Table Storageに購読情報を保存
    await upsertSubscription(email, {
        status: 'active',
        stripeCustomerId: session.customer,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    break;
}
```

**保存される情報**:
- ユーザーのメールアドレス
- 購読ステータス: `active`
- Stripe Customer ID
- 購読期間の終了日

### 3. Success Pageの表示

**現在の状態**: ⚠️ **Success Pageは存在するが、自動ログイン機能が未実装**

**期待される動作** (未実装):
1. URLパラメータからトークンを取得
2. トークンを検証
3. Chrome拡張機能にトークンを送信（`chrome.runtime.sendMessage`）
4. 拡張機能が自動的にログイン

**現状の問題点**:
- Success Pageにトークン受信処理がない
- Chrome拡張機能にトークン受信ハンドラがない
- `manifest.json`に`externally_connectable`設定がない

---

## 🔴 現在の問題: 自動ログインが未実装

### ユーザー視点での動線（現状）

```
1. Stripe決済完了 ✅
2. Success Pageに移動 ✅
3. 「決済完了しました」的なメッセージが表示される ✅
4. 【ここで止まる】Chrome拡張機能は未ログイン状態のまま ❌
5. ユーザーが手動で拡張機能を開いてログインする必要がある ❌
```

### 理想的な動線（実装すべき）

```
1. Stripe決済完了 ✅
2. Success Pageに移動 ✅
3. ページがトークンをChrome拡張機能に自動送信 🔄
4. 拡張機能がトークンを受け取り、自動ログイン 🔄
5. ユーザーはすぐに拡張機能を使い始められる 🔄
```

---

## 🔧 実装が必要な項目（優先順）

### 🔴 最優先: 自動ログイン実装

#### 1. `manifest.json`に`externally_connectable`追加

**ファイル**: `/manifest.json`

```json
{
  "externally_connectable": {
    "matches": [
      "https://stkarteai1763705952.z11.web.core.windows.net/*"
    ]
  }
}
```

**目的**: Success PageからChrome拡張機能へのメッセージ送信を許可

---

#### 2. Success Pageにトークン送信処理を追加

**ファイル**: `landing-page/src/pages/SuccessPage.jsx` (要作成または修正)

```javascript
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [loginStatus, setLoginStatus] = useState('processing');
  
  useEffect(() => {
    const token = searchParams.get('token');
    const sessionId = searchParams.get('session_id');
    
    if (!token) {
      setLoginStatus('error');
      return;
    }
    
    // Chrome拡張機能の拡張機能IDを設定
    const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'; // ← 実際のIDに置き換え
    
    // Chrome拡張機能にトークンを送信
    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: 'AUTH_TOKEN',
          token: token,
          sessionId: sessionId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('拡張機能への送信失敗:', chrome.runtime.lastError);
            setLoginStatus('manual');
          } else if (response && response.success) {
            setLoginStatus('success');
          } else {
            setLoginStatus('manual');
          }
        }
      );
    } else {
      // Chrome拡張機能が検出できない場合
      setLoginStatus('manual');
    }
  }, [searchParams]);
  
  return (
    <div className="success-container">
      <h1>✅ 登録完了！</h1>
      
      {loginStatus === 'processing' && (
        <p>Chrome拡張機能に自動ログイン中...</p>
      )}
      
      {loginStatus === 'success' && (
        <>
          <p>自動ログインが完了しました！</p>
          <p>Chrome拡張機能をご利用いただけます。</p>
        </>
      )}
      
      {loginStatus === 'manual' && (
        <>
          <p>登録が完了しました。</p>
          <p>Chrome拡張機能を開いて、以下のトークンでログインしてください：</p>
          <code>{searchParams.get('token')}</code>
        </>
      )}
      
      {loginStatus === 'error' && (
        <p>エラーが発生しました。お手数ですが、再度お試しください。</p>
      )}
    </div>
  );
}
```

---

#### 3. Chrome拡張機能にトークン受信処理を追加

**ファイル**: `/background.js` または `/utils/auth.js`

```javascript
// externally_connectableからのメッセージを受信
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log('[Background] External message received:', request);
    
    // Success Pageからのメッセージか確認
    if (sender.url && sender.url.startsWith('https://stkarteai1763705952.z11.web.core.windows.net/success')) {
      if (request.type === 'AUTH_TOKEN' && request.token) {
        // トークンを保存
        chrome.storage.local.set({
          authToken: request.token,
          sessionId: request.sessionId,
          loginTime: Date.now()
        }, () => {
          console.log('[Background] Token saved successfully');
          
          // トークンの検証（オプション）
          verifyAndStoreToken(request.token).then((isValid) => {
            if (isValid) {
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Invalid token' });
            }
          });
        });
        
        return true; // 非同期レスポンスのため
      }
    }
    
    sendResponse({ success: false, error: 'Invalid request' });
  }
);

// トークン検証関数（オプション）
async function verifyAndStoreToken(token) {
  try {
    // JWTトークンをデコード（ライブラリ使用推奨）
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // 有効期限チェック
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.error('[Auth] Token expired');
      return false;
    }
    
    // メールアドレスを保存
    if (payload.email) {
      await chrome.storage.local.set({ userEmail: payload.email });
    }
    
    return true;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return false;
  }
}
```

---

#### 4. 拡張機能のログイン状態チェック

**ファイル**: `/sidepanel/sidepanel.js` または適切な場所

```javascript
// ページロード時にログイン状態を確認
async function checkLoginStatus() {
  const { authToken, userEmail } = await chrome.storage.local.get(['authToken', 'userEmail']);
  
  if (authToken) {
    // トークンが存在する場合、検証
    const isValid = await verifyToken(authToken);
    
    if (isValid) {
      // ログイン済み
      showLoggedInUI(userEmail);
    } else {
      // トークンが無効
      showLoginUI();
    }
  } else {
    // 未ログイン
    showLoginUI();
  }
}

// トークン検証
async function verifyToken(token) {
  try {
    const response = await fetch('https://func-karte-ai-1763705952.azurewebsites.net/api/check-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', checkLoginStatus);
```

---

## 📊 データフロー

### Stripe決済完了時のデータの流れ

```
[Stripe Checkout]
    ↓ (決済完了)
    
[Stripe Webhook] → [Azure Functions: stripe-webhook]
    ↓
[Azure Table Storage]
    - PartitionKey: "subscription"
    - RowKey: {email}
    - status: "active"
    - stripeCustomerId: "cus_xxx"
    - currentPeriodEnd: "2025-12-30T..."
    
    
[Success Page] ← URL: ?token={JWT}&session_id={SESSION_ID}
    ↓ (chrome.runtime.sendMessage)
    
[Chrome拡張機能]
    ↓ (chrome.storage.local.set)
    
[ローカルストレージ]
    - authToken: {JWT}
    - userEmail: "super206cc@gmail.com"
    - sessionId: {SESSION_ID}
```

---

## 🎯 課金後の期待動作（完全実装後）

### ユーザー視点

1. **Stripeで決済** (カード情報入力)
2. **「処理中...」表示**
3. **自動的にSuccess Pageへ移動**
4. **「登録完了！自動ログイン中...」表示**
5. **数秒後「完了しました！」**
6. **Chrome拡張機能アイコンをクリック**
7. **すぐに使える状態**（ログイン済み）

### システム視点

```
T+0s:   Stripe決済完了
T+1s:   Success Pageリダイレクト
T+2s:   Stripe Webhook発火 → DB保存
T+2s:   Success PageがChrome拡張機能にトークン送信
T+3s:   Chrome拡張機能がトークンを保存
T+3s:   ログイン完了
```

---

## 🚧 現状の制限事項

### 1. Success Pageの実装状態

- ✅ ページ自体は存在する（ログより確認）
- ❌ トークン送信処理が未実装
- ❌ 自動ログインフローが未実装

### 2. Chrome拡張機能の実装状態

- ✅ 基本的な認証機能は存在（`utils/auth.js`）
- ❌ `externally_connectable`設定が未設定
- ❌ 外部からのメッセージ受信処理が未実装

### 3. 手動ログインフロー（現状の代替手段）

現在ユーザーができること：
1. Stripe決済完了
2. Success Pageを閉じる
3. Chrome拡張機能を開く
4. 手動でメールアドレスを入力してログイン
5. `check-subscription` APIが購読状態を確認
6. ログイン成功

---

## 🔜 次のステップ（実装優先順）

### Phase 1: 自動ログイン実装（最優先）

1. [ ] `manifest.json`に`externally_connectable`追加
2. [ ] Success Pageのトークン送信処理実装
3. [ ] Chrome拡張機能のトークン受信処理実装
4. [ ] エンドツーエンドテスト

**見積もり**: 2-3時間

---

### Phase 2: Success Page UX改善

1. [ ] ローディングアニメーション
2. [ ] エラーハンドリング
3. [ ] 手動ログイン用のフォールバック表示

**見積もり**: 1-2時間

---

### Phase 3: セキュリティ強化

1. [ ] トークンの有効期限チェック
2. [ ] トークンのリフレッシュ機能
3. [ ] 購読状態の定期確認

**見積もり**: 2-3時間

---

## 💡 重要な注意点

### セキュリティ

- **トークンの扱い**: JWTトークンはURLパラメータで渡されるため、ブラウザ履歴に残る
- **対策**: トークンは短命（15分程度）にし、使用後は新しいセッショントークンに置き換える

### Chrome拡張機能ID

- Success Pageから拡張機能にメッセージを送るには、**拡張機能IDが必要**
- IDは`chrome://extensions/`で確認（デベロッパーモードON）
- 形式: `abcdefghijklmnopqrstuvwxyz123456`

### CORS設定

- 既にLanding PageのURLは許可済み
- 追加のCORS設定は不要

---

## 📝 まとめ

### 現在できていること ✅

- Landing Page → Magic Link送信
- Magic Link → トークン検証
- トークン検証 → Stripe Checkout
- Stripe決済 → Webhook → DB保存
- Success Page表示

### 現在できていないこと ❌

- **Success Page → Chrome拡張機能への自動ログイン**
- トークンの自動転送
- ログイン状態の自動確認

### すぐに実装すべきこと 🔴

**自動ログイン機能** (2-3時間で実装可能)
1. manifest.json設定
2. Success Page実装
3. Chrome拡張機能実装
4. テスト

これが完成すれば、**ユーザーは決済完了後、自動的にログインされた状態でChrome拡張機能を使い始められます**。

---

**実装を始めますか？**それとも、まず現状の手動ログインフローを試してみますか？



# Chrome Web Store 拡張機能インストールリンク実装ガイド

## 拡張機能情報

- **拡張機能ID**: `gjfmckakcnmbdjcenehikciikakpgfkd`
- **Chrome Web Store URL**: 
  ```
  https://chrome.google.com/webstore/detail/gjfmckakcnmbdjcenehikciikakpgfkd
  ```

## 実装方法

### 1. Success Pageへの実装

Success Page（`/success`）に以下のコードを追加してください：

```html
<!-- 拡張機能インストールセクション -->
<div class="extension-section" style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #eee;">
  <h3 style="margin-bottom: 15px;">Chrome拡張機能をインストール</h3>
  <p style="color: #666; margin-bottom: 20px;">
    AI機能を使用するには、Chrome拡張機能のインストールが必要です
  </p>
  <a href="https://chrome.google.com/webstore/detail/gjfmckakcnmbdjcenehikciikakpgfkd" 
     target="_blank"
     class="btn btn-primary">
    📦 Chrome拡張機能をインストール
  </a>
  <p style="margin-top: 15px; font-size: 12px; color: #999;">
    インストール後、このページを再読み込みしてください
  </p>
</div>
```

### 2. Success Pageの自動ログイン機能

Success Pageに以下のJavaScriptを追加：

```javascript
// 拡張機能ID
const EXTENSION_ID = 'gjfmckakcnmbdjcenehikciikakpgfkd';

// URLパラメータからトークンを取得
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');

if (token) {
  // 拡張機能がインストールされているか確認
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage(EXTENSION_ID, {
      type: 'AUTH_TOKEN',
      token: token,
      email: email
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('拡張機能が見つかりません。インストールしてください。');
      } else if (response && response.success) {
        console.log('✅ 自動ログイン成功:', response.email);
      }
    });
  }
}
```

### 3. Landing Pageへの実装

Landing Pageにも拡張機能インストールリンクを追加：

```html
<div class="extension-install-section" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
  <h3 style="margin-bottom: 15px; color: #333;">🚀 Chrome拡張機能をインストール</h3>
  <p style="color: #666; margin-bottom: 20px;">
    AI機能を使用するには、Chrome拡張機能のインストールが必要です
  </p>
  <a href="https://chrome.google.com/webstore/detail/gjfmckakcnmbdjcenehikciikakpgfkd" 
     target="_blank"
     class="btn btn-primary">
    📦 Chrome拡張機能をインストール
  </a>
</div>
```

## 拡張機能のインストール状態確認

拡張機能がインストールされているか確認するJavaScript：

```javascript
function checkExtensionInstalled() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      resolve(false);
      return;
    }

    chrome.runtime.sendMessage('gjfmckakcnmbdjcenehikciikakpgfkd', 
      { type: 'PING' }, 
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

// 使用例
checkExtensionInstalled().then(isInstalled => {
  if (isInstalled) {
    console.log('拡張機能がインストールされています');
  } else {
    console.log('拡張機能がインストールされていません');
  }
});
```

## 完全なフロー

1. **Landing Page**: メールアドレス入力 → Magic Link送信
2. **Magic Link**: メールからリンクをクリック → トークン発行
3. **Stripe Checkout**: 決済完了
4. **Success Page**: 
   - 拡張機能インストールリンクを表示
   - トークンを拡張機能に自動送信
   - 自動ログイン完了
5. **拡張機能**: AI機能が使用可能

## 注意事項

- 拡張機能がChrome Web Storeに公開されている必要があります
- 公開前は、拡張機能のパッケージを直接インストールする方法を案内してください
- `externally_connectable`が`manifest.json`に設定されていることを確認してください

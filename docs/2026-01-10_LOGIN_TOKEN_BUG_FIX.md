# ログイン・トークン処理バグ修正レポート

**日付**: 2026-01-10
**影響範囲**: 全ユーザー（v0.2.3使用時）
**解決状態**: 完了（v0.2.4 + サーバー修正）

---

## 問題の概要

v0.2.3の拡張機能で「ログアウト→再ログイン」「新規登録」が動作しない問題が発生。

### 症状
- トークンは届いているが「トークンの形式が正しくありません」エラー
- 新規ユーザー・既存ユーザーともにログインできない
- 一度もログアウトしなければ動作継続

---

## 原因分析

### 1. クライアントサイド（拡張機能 v0.2.3）

**問題箇所**: `extensions/sidepanel/sidepanel.js`

```javascript
// v0.2.3（問題あり）
await window.AuthManager.setToken(token, email);
window.AuthManager.user = { id: email, email: email };
const isSubscribed = await window.AuthManager.checkSubscription();

// v0.2.4（修正後）
await window.AuthManager.loginWithToken(token);
const isSubscribed = window.AuthManager.isSubscribed;
```

**原因**: トークン処理が`setToken()` + 手動user設定 + `checkSubscription()`の分離した呼び出しになっており、一貫した検証・保存処理が行われていなかった。

### 2. サーバーサイド（Azure Functions）

**問題箇所**: `azure-functions/auth-verify-token/index.js` 200行目

```javascript
// 修正前（問題あり）
var extId = ${extensionId ? '`' + '${extensionId}' + '`' : '""'};
// → 出力: var extId = `${extensionId}`;
// → ブラウザでextensionIdが未定義のため送信失敗

// 修正後
var extId = "${extensionId}";
// → 出力: var extId = "knldjmfmopnpolahpmmgbagdohdbeiep";
// → 正しく拡張機能IDが埋め込まれる
```

**原因**: JavaScriptテンプレートリテラルの二重使用により、サーバーサイドの変数がクライアントサイドで展開されようとしていた。

---

## 修正内容

### クライアントサイド（v0.2.4）

| ファイル | 変更内容 |
|----------|----------|
| `extensions/sidepanel/sidepanel.js` | トークン処理を`loginWithToken()`に統一 |
| `extensions/sidepanel/sidepanel.js` | エラーハンドリング追加（`.catch()`） |
| `extensions/sidepanel/sidepanel.js` | 再ログインURL修正（`/#/login` → `/login`） |
| `extensions/manifest.json` | バージョン 0.2.3 → 0.2.4 |

### サーバーサイド（2026-01-10デプロイ）

| ファイル | 変更内容 |
|----------|----------|
| `azure-functions/auth-verify-token/index.js` | EXTENSION_ID展開バグ修正 |

---

## 検証結果

### Azure Functions動作確認

| エンドポイント | 結果 |
|----------------|------|
| JWT_SECRET設定 | ✅ 本番に存在 |
| auth-send-magic-link | ✅ 動作 |
| auth-verify-token | ✅ 修正後動作 |
| check-subscription | ✅ 動作 |
| chat（JWT検証） | ✅ 動作 |

### EXTENSION_ID展開確認

```
修正前: var extId = `${extensionId}`;     // undefined
修正後: var extId = "knldjmfmopnpolahpmmgbagdohdbeiep";  // 正しいID
```

---

## 影響を受けたユーザー

### 確認済み
- `s.tsuru@hakata-sta-cl.com` - 新規登録、トークン処理エラー
  - サブスク状態: active (trialing)
  - 対応: v0.2.4審査通過待ち

### 対応方針
- v0.2.4がChrome Web Store審査通過後、自動更新で解決
- 手動トークン発行は効果なし（v0.2.3のトークン処理が問題のため）

---

## v0.2.4での解決確認

**v0.2.4 + サーバー修正により、以下が正常動作：**

1. **新規ユーザー登録**
   - Magic Link送信 → Stripe決済 → Success Page → 拡張機能にトークン送信 ✅

2. **既存ユーザー再ログイン**
   - 再ログインページ → Magic Link → auth-verify-token → 拡張機能にトークン送信 ✅

3. **通常使用**
   - AI機能、テンプレート機能、設定同期 → 全て動作 ✅

---

## 今後の予防策

### 1. デプロイ前チェックリスト
- [ ] JWT_SECRETが本番に設定されているか確認
- [ ] EXTENSION_IDが本番に設定されているか確認
- [ ] テンプレートリテラルの展開が正しいか確認
- [ ] 新規ユーザーフローをE2Eテスト

### 2. 環境変数バックアップ
```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  -o json > azure-settings-backup.json
```

### 3. 拡張機能バージョン管理
- クライアント・サーバー両方の変更がある場合、同時デプロイを徹底
- 破壊的変更時はCHANGELOGに明記

---

## 関連コミット

- `e9ac34da` - feat: 拡張機能に再ログインボタン追加 (v0.2.3) ← 問題発生
- `c1eb0a04` - docs: 2026-01-08 アップデート内容まとめ
- （未コミット）- fix: auth-verify-token EXTENSION_ID展開バグ修正

---

## まとめ

| 項目 | 状態 |
|------|------|
| 問題の根本原因 | 特定済み（クライアント + サーバー両方に問題） |
| サーバー修正 | ✅ 完了・デプロイ済み |
| クライアント修正 | ✅ v0.2.4作成済み・審査中 |
| 通常ユーザー | v0.2.4で問題なく動作 |

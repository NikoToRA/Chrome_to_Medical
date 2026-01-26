# セキュリティ修正ログ

**実施日**: 2026-01-26
**実施者**: Claude Opus 4.5 + 平山

---

## 修正サマリー

| # | 修正内容 | 状態 | 既存ユーザー影響 |
|---|---------|------|------------------|
| 1 | JWT_SECRETのドキュメント削除 | ✅ 完了 | なし |
| 2 | メール送信フォールバック削除 | ✅ 完了 | なし |
| 3 | エラー詳細漏洩防止（5箇所） | ✅ 完了 | なし |
| 4 | MOCK_SUBSCRIPTIONフラグ削除 | ✅ 完了 | なし |
| 5 | デバッグフラグ無効化 | ✅ 完了 | なし |

---

## 詳細

### 1. JWT_SECRETのドキュメント削除

**問題**: ドキュメントにJWT_SECRETがハードコードされていた

**修正ファイル**:
- `docs/AZURE_PORTAL_DIRECT_CHECK.md`
- `docs/REBUILD_SUMMARY.md`
- `scripts/test-jwt-verification.js`

**修正内容**: 秘密鍵を環境変数から読み取るように変更

---

### 2. メール送信フォールバック削除

**問題**: `SENDER_EMAIL_ADDRESS`が未設定の場合、デフォルトドメイン（azurecomm.net）にフォールバックしていた

**修正ファイル**: `azure-functions/lib/email.js`

**修正内容**:
- フォールバックを削除
- 未設定の場合は明確なエラーをスロー

---

### 3. エラー詳細漏洩防止

**問題**: エラーレスポンスに`error.message`や`error.stack`を含めていた

**修正ファイル**:
- `azure-functions/auth-send-magic-link/index.js`
- `azure-functions/cancel-subscription/index.js` (2箇所)
- `azure-functions/chat/handler.js` (2箇所)

**修正内容**: 詳細情報はログにのみ記録し、クライアントには日本語の一般的なメッセージを返却

---

### 4. MOCK_SUBSCRIPTIONフラグ削除

**問題**: テスト用フラグが本番コードに残っていた

**修正ファイル**: `azure-functions/check-subscription/index.js`

**修正内容**: テストコードブロックを完全削除

---

### 5. デバッグフラグ無効化

**問題**: 本番環境で以下のフラグが`true`に設定されていた
- `ALLOW_FAKE_EMAIL_SUCCESS`
- `RETURN_MAGIC_LINK`

**修正内容**: Azure Function Appの環境変数を`false`に変更

```bash
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings "ALLOW_FAKE_EMAIL_SUCCESS=false" "RETURN_MAGIC_LINK=false"
```

---

## コミット履歴

```
75147058 fix: MOCK_SUBSCRIPTIONテストフラグを削除
c86f3340 fix: Chat API認証エラーの詳細漏洩を修正
d9898920 fix: セキュリティ高リスク3件の修正
```

---

## 確認項目

### local.settings.json の露出確認

```
結果: ✅ 安全
- .gitignoreに含まれている
- git履歴にコミットされていない
- リモートリポジトリにプッシュされていない
```

### 動作確認

| エンドポイント | 確認結果 |
|---------------|---------|
| health | ✅ `{"status":"ok"}` |
| auth-send-magic-link | ✅ メール即座に到達 |
| check-subscription | ✅ 既存ユーザー情報正常取得 |
| cancel-subscription (無効トークン) | ✅ 詳細漏洩なし |
| chat (無効トークン) | ✅ 詳細漏洩なし |

---

## 残タスク（P1以降）

- [ ] Jest導入・ユニットテスト追加
- [ ] console.log → context.log 統一
- [ ] API ドキュメント作成
- [ ] エラーハンドリング統一

---

## 備考

- Chrome拡張機能の再リリース: **不要**
- 既存ユーザーへの影響: **なし**
- サーバー再起動: デプロイ時に自動実行

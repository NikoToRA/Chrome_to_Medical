# 現在のワークフロー分析

**作成日**: 2025-11-29

---

## 🎯 正しいワークフロー（目標）

```
1. 申し込み（LPフォーム）
   ↓
2. DBに施設情報が保存される
   ↓
3. Magic Link付きのメールが届く
   ↓
4. メールのMagic Linkをクリック
   ↓
5. Stripeで課金申し込み（自動リダイレクト）
   ↓
6. 決済完了
   ↓
7. Chrome拡張機能を入れられるようになる（Webstore経由）
   ↓
8. 使えるようになる
```

---

## 📊 現在の実装状況

### ✅ 完了している部分

1. **LPフォーム**
   - 施設情報（name, facilityName, address, phone, email）を入力
   - 「無料で登録する」ボタン

2. **auth-send-magic-link API**
   - ユーザー情報をDB（Azure Table Storage）に保存
   - Magic Linkトークンを生成
   - メール送信（SendGridまたはAzure Communication Services）

### ⚠️ 問題がある部分

**現在の実装**: `registerAndPayment()` が2つのAPIを呼んでいる
```javascript
// 1. auth-send-magic-link（正しい）
// 2. create-checkout-session（不要！）
```

**問題点**:
- LPフォーム送信時に直接Stripe Checkoutにリダイレクトしようとしている
- 本来は、Magic Linkをクリックした後にStripe Checkoutにリダイレクトすべき

---

## 🔧 修正が必要な部分

### 1. LPフォームの処理を簡素化

**現在**:
```javascript
// registerAndPayment() が2つのAPIを呼ぶ
1. auth-send-magic-link
2. create-checkout-session → Stripe Checkoutにリダイレクト
```

**修正後**:
```javascript
// sendMagicLink() が1つのAPIだけを呼ぶ
1. auth-send-magic-link → メール送信完了メッセージを表示
```

### 2. Magic Linkクリック時の処理

**現在**: `auth-verify-token` がトークン表示ページを表示

**修正後**: `auth-verify-token` がStripe Checkoutに自動リダイレクト
- トークン検証
- セッショントークン発行
- Stripe Checkoutセッション作成
- Stripe Checkoutへリダイレクト（302）

---

## 📝 実装すべきステップ

### ステップ1: LPフォームの修正（最優先）

**目標**: 申し込み → DB保存 → Magic Linkメール送信

**変更内容**:
1. `registerAndPayment()` を `sendMagicLink()` に変更
2. `create-checkout-session` の呼び出しを削除
3. メール送信完了メッセージを表示

**完了条件**:
- ✅ フォーム送信 → DBに施設情報が保存される
- ✅ Magic Link付きのメールが届く
- ✅ メール送信完了メッセージが表示される

### ステップ2: Magic Linkクリック時の処理（次）

**目標**: Magic Linkクリック → Stripe Checkout自動リダイレクト

**変更内容**:
1. `auth-verify-token` でStripe Checkoutセッションを作成
2. Stripe Checkoutへ自動リダイレクト（302）

**完了条件**:
- ✅ Magic Linkクリック → Stripe Checkoutページに自動リダイレクト
- ✅ Stripe Checkoutで決済情報を入力できる

### ステップ3以降

- Stripe Checkout完了 → 成功ページ
- 拡張機能への自動ログイン
- Webstore公開

---

## 🎯 今すぐ実装すべきこと

**ステップ1のみを実装**:
- LPフォーム送信 → DB保存 → Magic Linkメール送信

これが完了すれば、ユーザーの理解通り「申し込みしたらDBに施設情報が届いて、Magic Link付きのメールが届く」が実現します。


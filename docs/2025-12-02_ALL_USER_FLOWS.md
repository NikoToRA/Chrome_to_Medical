# 全ユーザーフロー詳細ドキュメント

**作成日**: 2025-12-02
**目的**: Karte AI+ の全ユーザーフローを網羅的に把握し、各フローの動作を検証する

---

## 📋 目次

1. [フロー1: 通常申し込み→14日トライアル→継続使用](#フロー1-通常申し込み14日トライアル継続使用)
2. [フロー2: 無料期間内にキャンセル](#フロー2-無料期間内にキャンセル)
3. [フロー3: 継続使用後にキャンセル](#フロー3-継続使用後にキャンセル)
4. [フロー4: Stripe決済ページでキャンセル](#フロー4-stripe決済ページでキャンセル)
5. [フロー5: トライアル警告メール受信（10日後）](#フロー5-トライアル警告メール受信10日後)
6. [フロー6: 月末に領収書受領](#フロー6-月末に領収書受領)
7. [フロー7: Magic Linkの有効期限切れ](#フロー7-magic-linkの有効期限切れ)
8. [フロー8: 決済失敗（カード情報不正など）](#フロー8-決済失敗カード情報不正など)
9. [フロー9: Webhook遅延/失敗](#フロー9-webhook遅延失敗)
10. [フロー10: 重複登録](#フロー10-重複登録)

---

## フロー1: 通常申し込み→14日トライアル→継続使用

### 概要
最も基本的な正常系フロー。ユーザーが申し込みから継続使用まで問題なく進む。

### ステップ

```
1. LPでメール入力
   ↓
2. auth-send-magic-link API呼び出し
   → Magic Linkメール送信
   ↓
3. ユーザーがメールからMagic Linkをクリック
   ↓
4. auth-verify-token API呼び出し
   → JWTトークン検証
   → Stripe Checkout Session作成
   ↓
5. Stripe決済ページ表示（14日間無料トライアル付き）
   ↓
6. ユーザーがカード情報入力して決済
   ↓
7. checkout.session.completed webhook発火
   → DBに購読情報保存:
     - status: 'trialing' または 'active'
     - currentPeriodEnd: 14日後
     - stripeCustomerId: cus_xxx
     - stripeSubscriptionId: sub_xxx
   ↓
8. Success Page表示（トークン付きURL）
   ↓
9. Chrome拡張機能で手動ログイン
   ↓
10. 14日間トライアル使用
   ↓
11. 14日後、Stripeが自動的に課金開始
    → customer.subscription.updated webhook
    → status: 'active' に更新
   ↓
12. 継続使用
```

### 関連API/Functions

- `auth-send-magic-link`
- `auth-verify-token`
- `stripe-webhook` (checkout.session.completed)
- `stripe-webhook` (customer.subscription.updated)
- `check-subscription`

### DBの状態変化

| タイミング | status | currentPeriodEnd | cancelAtPeriodEnd |
|-----------|--------|------------------|-------------------|
| 決済完了時 | trialing | 14日後 | false |
| 14日経過後 | active | 次の月末 | false |

### 検証項目

- [ ] Magic Linkメールが届く
- [ ] Magic Linkクリック後、Stripe決済ページに遷移
- [ ] 決済完了後、Success Pageに遷移
- [ ] DBに正しく購読情報が保存される
- [ ] check-subscription APIが `active: true` を返す
- [ ] 14日後に自動課金が開始される

### 実装状況

✅ **実装済み**

### 潜在的な問題

- ⚠️ Success Pageからの自動ログイン未実装（手動ログイン必要）
- ⚠️ トライアル期間中のステータス表示がない

---

## フロー2: 無料期間内にキャンセル

### 概要
14日間のトライアル期間中にユーザーがキャンセルする。

### ステップ

```
1-9. （フロー1と同じ）
   ↓
10. ユーザーが拡張機能から「設定」→「サブスクリプション管理」
   ↓
11. create-portal-session API呼び出し
    → Stripe Customer Portal URLを取得
   ↓
12. Stripe Customer Portalでキャンセルボタンをクリック
   ↓
13. customer.subscription.updated webhook発火
    → DBに保存:
      - cancelAtPeriodEnd: true
      - status: 'trialing' (まだ有効)
   ↓
14. トライアル期間終了（14日後）
   ↓
15. customer.subscription.deleted webhook発火
    → DBに保存:
      - status: 'canceled'
      - canceledAt: 現在時刻
   ↓
16. check-subscription APIが `active: false` を返す
   ↓
17. 拡張機能が使えなくなる
```

### 関連API/Functions

- `create-portal-session`
- `stripe-webhook` (customer.subscription.updated)
- `stripe-webhook` (customer.subscription.deleted)
- `check-subscription`

### DBの状態変化

| タイミング | status | cancelAtPeriodEnd | canceledAt |
|-----------|--------|-------------------|------------|
| キャンセル時 | trialing | true | null |
| 14日経過後 | canceled | false | 現在時刻 |

### 検証項目

- [ ] create-portal-session APIが正しくURLを返す
- [ ] Stripe Portalでキャンセルできる
- [ ] cancelAtPeriodEndフラグが正しく保存される
- [ ] トライアル期間中は引き続き使える
- [ ] トライアル期間終了後、使えなくなる
- [ ] customer.subscription.deletedが正しく処理される

### 実装状況

✅ **実装済み**

### 潜在的な問題

- ⚠️ キャンセル後も期間終了までは使えることをUIで明示していない
- ⚠️ キャンセル確認メールの送信が未実装

---

## フロー3: 継続使用後にキャンセル

### 概要
トライアル期間を過ぎて課金が開始された後にキャンセルする。

### ステップ

```
1-12. （フロー1と同じ）
   ↓
13. 数ヶ月間課金が続く
    → 毎月 customer.subscription.updated webhook
   ↓
14. ユーザーがキャンセルしたくなる
   ↓
15-17. （フロー2の10-17と同じ）
```

### 関連API/Functions

- `create-portal-session`
- `stripe-webhook` (customer.subscription.updated)
- `stripe-webhook` (customer.subscription.deleted)
- `check-subscription`

### DBの状態変化

| タイミング | status | currentPeriodEnd | cancelAtPeriodEnd |
|-----------|--------|------------------|-------------------|
| キャンセル時 | active | 次の月末 | true |
| 月末 | canceled | 月末 | false |

### 検証項目

- [ ] 課金中でもキャンセルできる
- [ ] キャンセル後、現在の課金期間終了まで使える
- [ ] 期間終了後、使えなくなる
- [ ] 返金は発生しない（期間終了まで有効）

### 実装状況

✅ **実装済み**

### 潜在的な問題

- ⚠️ 返金ポリシーが利用規約に明記されているか要確認
- ⚠️ キャンセル後の再登録フローが未確認

---

## フロー4: Stripe決済ページでキャンセル

### 概要
Stripe決済ページまで進んだが、カード情報入力前に離脱する。

### ステップ

```
1. LPでメール入力
   ↓
2. Magic Linkメール受信
   ↓
3. Magic Linkクリック
   ↓
4. Stripe決済ページ表示
   ↓
5. ユーザーが「戻る」ボタンまたはブラウザバック
   ↓
6. Cancel Pageに遷移
   ↓
7. 「再申し込み」ボタンでLPに戻れる
   ↓
8. **DBには何も保存されない**
```

### 関連API/Functions

- なし（Stripeの標準動作）

### DBの状態変化

なし（レコードが作成されない）

### 検証項目

- [ ] Cancel Pageが正しく表示される
- [ ] 再申し込みボタンが機能する
- [ ] DBに不要なレコードが作成されない
- [ ] 同じメールアドレスで再度申し込める

### 実装状況

✅ **実装済み**

### 潜在的な問題

- ⚠️ Magic Linkの有効期限内なら再利用できてしまう（セキュリティリスク）
- ⚠️ 離脱理由の追跡ができない

---

## フロー5: トライアル警告メール受信（10日後）

### 概要
登録から10日後に、トライアル期間終了の警告メールを送信する。

### ステップ

```
1-9. （フロー1と同じ）
   ↓
10. 登録から10日後、check-trial-warning Timer Function実行
   ↓
11. トライアル警告メール送信
    - 件名: 「【Karte AI+】トライアル期間終了のお知らせ」
    - 内容: 「あと4日で課金が始まります」
    - Stripeキャンセルリンク付き
   ↓
12. DBに trialWarningSent フラグを立てる
   ↓
13. ユーザーがメールを確認
   ↓
14. （オプション）キャンセルリンクからフロー2へ
```

### 関連API/Functions

- `check-trial-warning` (Timer Trigger)
- `utils/email.js` (sendTrialWarningEmail)
- `utils/database.js` (getUsersByRegistrationDate, markTrialWarningSent)

### DBの状態変化

| タイミング | trialWarningSent |
|-----------|------------------|
| メール送信前 | false/null |
| メール送信後 | true |

### 検証項目

- [ ] Timer Functionが毎日実行される
- [ ] 登録から10日後のユーザーが正しく抽出される
- [ ] メールが正しく送信される
- [ ] trialWarningSentフラグが立つ
- [ ] 重複送信されない
- [ ] キャンセルリンクが機能する

### 実装状況

⚠️ **部分実装**
- Timer Function: ✅ 実装済み
- Email送信: ✅ 実装済み
- Database関数: ❌ **未実装**（getUsersByRegistrationDate, markTrialWarningSent）

### 潜在的な問題

- 🔴 **database.js に必要な関数が未実装**
- ⚠️ 登録日の記録方法が未確認（currentPeriodEndから逆算？）
- ⚠️ Timer Triggerのスケジュール設定が未確認

---

## フロー6: 月末に領収書受領

### 概要
課金が発生する月末に、自動的に領収書PDFをメール送信する。

### ステップ

```
1-12. （フロー1で課金開始）
   ↓
13. 月末に send-receipts Timer Function実行
   ↓
14. 課金対象ユーザーを抽出
   ↓
15. 領収書PDF生成
    - 領収書番号: YYYY-MM-XXXX形式
    - 金額、請求期間、会社情報
   ↓
16. 領収書メール送信
   ↓
17. DBに領収書送信履歴を記録
   ↓
18. 毎月繰り返し
```

### 関連API/Functions

- `send-receipts` (Timer Trigger)
- `utils/receipt.js` (generateReceipt, generateReceiptNumber)
- `utils/email.js` (sendReceiptEmail)
- `utils/database.js` (getUsersForBilling, recordReceiptSent)

### DBの状態変化

| タイミング | receipts (想定) |
|-----------|-----------------|
| 領収書送信後 | 新レコード追加 |

### 検証項目

- [ ] Timer Functionが月末に実行される
- [ ] 課金対象ユーザーが正しく抽出される
- [ ] PDF生成が正常に動作する
- [ ] メール送信が成功する
- [ ] 送信履歴が記録される
- [ ] トライアル中のユーザーには送信されない

### 実装状況

⚠️ **部分実装**
- Timer Function: ✅ 実装済み
- Receipt Generator: ❌ **未実装** (utils/receipt.js)
- Email送信: ✅ 実装済み
- Database関数: ❌ **未実装**（getUsersForBilling, recordReceiptSent）

### 潜在的な問題

- 🔴 **receipt.js が存在しない**
- 🔴 **database.js に必要な関数が未実装**
- ⚠️ PDFライブラリ（pdfkit）のセットアップ確認必要
- ⚠️ 会社情報（config/company.json）の内容確認必要

---

## フロー7: Magic Linkの有効期限切れ

### 概要
Magic Linkを15分以内にクリックしなかった場合のエラーハンドリング。

### ステップ

```
1. LPでメール入力
   ↓
2. Magic Linkメール受信
   ↓
3. 15分以上経過（JWTの有効期限）
   ↓
4. Magic Linkクリック
   ↓
5. auth-verify-token API呼び出し
   → JWT検証失敗（expエラー）
   ↓
6. エラーレスポンス返却
   ↓
7. エラーページ表示（未実装の可能性）
```

### 関連API/Functions

- `auth-verify-token`

### DBの状態変化

なし

### 検証項目

- [ ] 有効期限が正しく15分に設定されている
- [ ] 期限切れトークンで適切なエラーが返る
- [ ] エラーページが実装されている
- [ ] エラーページから再送信できる

### 実装状況

⚠️ **部分実装**
- JWT有効期限: ✅ 実装済み（15分）
- エラーレスポンス: ✅ 実装済み
- エラーページ: ❌ **未実装**
- 再送信機能: ❌ **未実装**

### 潜在的な問題

- 🔴 **専用のエラーページが存在しない**
- 🔴 **再送信ボタンがない**
- ⚠️ ユーザーが何をすればいいかわからない

---

## フロー8: 決済失敗（カード情報不正など）

### 概要
Stripe決済ページでカード情報が無効、または残高不足の場合。

### ステップ

```
1-4. （フロー1と同じ）
   ↓
5. Stripe決済ページでカード情報入力
   ↓
6. カードが無効/残高不足/セキュリティコード誤り
   ↓
7. Stripeがエラー表示（Stripe側の標準UI）
   ↓
8. ユーザーが再入力 または 諦める
   ↓
9. **DBには何も保存されない**
```

### 関連API/Functions

- なし（Stripeの標準動作）

### DBの状態変化

なし

### 検証項目

- [ ] Stripeが適切なエラーメッセージを表示
- [ ] ユーザーが再試行できる
- [ ] DBに不要なレコードが作成されない
- [ ] 失敗したカード情報が保存されない

### 実装状況

✅ **実装済み**（Stripe標準機能）

### 潜在的な問題

- ⚠️ 決済失敗の分析ができない（Stripeダッシュボードのみ）
- ⚠️ カスタムエラーメッセージが表示できない

---

## フロー9: Webhook遅延/失敗

### 概要
Stripe webhookの配信が遅延または失敗した場合の挙動。

### ステップ

```
1-5. （フロー1と同じ）
   ↓
6. checkout.session.completed webhook送信
   ↓
7. Azure Functions側でエラー発生 または ネットワーク遅延
   ↓
8. Webhookが失敗
   ↓
9. Success Page表示（ユーザーは成功と認識）
   ↓
10. 拡張機能でログイン試行
   ↓
11. check-subscription APIが `active: false` を返す（DBに未保存）
   ↓
12. ログインできない
   ↓
13. Stripeが自動リトライ（最大3日間、指数バックオフ）
   ↓
14. リトライ成功
   ↓
15. DBに購読情報保存
   ↓
16. ログイン可能になる
```

### 関連API/Functions

- `stripe-webhook`
- `check-subscription`

### DBの状態変化

| タイミング | 状態 |
|-----------|------|
| Webhook失敗時 | レコードなし |
| リトライ成功後 | レコード作成 |

### 検証項目

- [ ] Webhook署名検証が正しく動作
- [ ] エラー時に適切なログが記録される
- [ ] Stripeのリトライが正常に処理される
- [ ] 最大3日間待てば復旧する
- [ ] ユーザーへの通知方法がある

### 実装状況

⚠️ **部分実装**
- Webhook署名検証: ✅ 実装済み
- エラーログ: ✅ 実装済み
- リトライ対応: ✅ 実装済み（Stripe標準）
- ユーザー通知: ❌ **未実装**

### 潜在的な問題

- 🔴 **Webhook失敗をユーザーに通知する仕組みがない**
- ⚠️ 3日間ログインできない状態が続く可能性
- ⚠️ Application Insightsで監視しているか要確認

---

## フロー10: 重複登録

### 概要
既に購読中のメールアドレスで再度申し込みを行う。

### ステップ

```
1-8. （フロー1と同じ）
   ↓
9. 同じメールアドレスで再度フロー1を実行
   ↓
10. 新しいStripe Customer作成
    - 新しい cus_xxx
    - 新しい sub_xxx
   ↓
11. checkout.session.completed webhook
   ↓
12. upsertSubscription 実行
    → 既存レコードが上書き
    → 古いstripeCustomerIdが失われる
   ↓
13. **古いStripe Customerは孤立**
    → Stripeダッシュボード上に残る
    → 課金が発生する可能性
```

### 関連API/Functions

- `auth-verify-token`
- `stripe-webhook`
- `lib/table.js` (upsertSubscription)

### DBの状態変化

| タイミング | stripeCustomerId | stripeSubscriptionId |
|-----------|------------------|---------------------|
| 初回登録 | cus_old | sub_old |
| 重複登録後 | cus_new | sub_new |

### 検証項目

- [ ] 既存購読があるか事前チェックしているか
- [ ] 重複登録を許可するか/拒否するか
- [ ] 古いStripe CustomerをどうするかDBが正しく上書きされるか
- [ ] 二重課金が発生しないか

### 実装状況

❌ **未実装**
- 重複チェック: ❌ なし
- 既存購読の処理: ❌ なし
- エラー表示: ❌ なし

### 潜在的な問題

- 🔴 **重複登録が防げない**
- 🔴 **古いStripe Customerが孤立する**
- 🔴 **二重課金のリスク**
- ⚠️ auth-verify-token で事前チェックが必要

---

## 🎯 検証優先順位

### 🔴 高優先度（即対応必要）

1. **フロー10: 重複登録** - 二重課金リスク
2. **フロー7: Magic Link有効期限切れ** - UX改善必須
3. **フロー5: トライアル警告メール** - Database関数未実装
4. **フロー6: 月末領収書送信** - Receipt生成未実装

### 🟡 中優先度（近日中に対応）

5. **フロー9: Webhook遅延/失敗** - ユーザー通知未実装
6. **フロー2: 無料期間内キャンセル** - UI改善
7. **フロー3: 継続使用後キャンセル** - 利用規約確認

### 🟢 低優先度（後回し可）

8. **フロー1: 通常申し込み** - 自動ログイン実装
9. **フロー4: Stripe決済ページキャンセル** - 分析機能
10. **フロー8: 決済失敗** - カスタムエラー表示

---

## 📝 次のアクション

各フローを上記の優先順位に従って、1つずつ検証・実装していきます。

**検証方法**:
1. 実装状況の確認
2. 実際のテスト実行
3. 不具合・未実装の洗い出し
4. 必要な修正・実装
5. 再テスト
6. ドキュメント更新

---

**それでは、フロー10（重複登録）から始めましょう。**

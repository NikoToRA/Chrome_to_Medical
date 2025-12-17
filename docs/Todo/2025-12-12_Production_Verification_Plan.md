# 本番運用前機能検証プラン

**作成日**: 2025-12-12
**目的**: 本番リリース前に、実装したメール通知機能とアクセス制御が正しく動作することを確認する。

---

## 🛠 検証環境
- **Backend**: Azure Functions (Local or Staging)
- **Frontend**: Chrome Extension (Local Unpacked)
- **Payment**: Stripe Test Mode
- **Tools**: Stripe CLI, Stripe Dashboard

---

## 🧪 テストケース詳細

### 1. ウェルカムメール (Registration)
新規登録時に適切なメールが送信されるか確認する。

- **手順**:
    1. Stripe CLIでイベントをトリガー:
       ```bash
       stripe trigger checkout.session.completed
       ```
    2. または、ランディングページの「無料トライアル開始」からテストカード(`4242...`)で登録を行う。
- **確認事項**:
    - [ ] `sendWelcomeEmail` がエラーなく実行されること (Azure Logs)
    - [ ] 受信したメールの件名が「【Karte AI Plus】登録完了・無料トライアル開始のお知らせ」であること
    - [ ] 本文に「14日間の無料トライアル」の終了日が正しく記載されていること

### 2. キャンセル完了メール (Cancellation)
解約手続き完了時にメールが送信されるか確認する。

- **手順**:
    1. Stripe CLIでイベントをトリガー:
       ```bash
       stripe trigger customer.subscription.deleted
       ```
    2. または、拡張機能の「お支払い情報の確認・更新」からカスタマーポータルへ移動し、「プランをキャンセル」を実行する。
- **確認事項**:
    - [ ] `sendCancellationEmail` がエラーなく実行されること (Azure Logs)
    - [ ] 受信したメールの件名が「【Karte AI Plus】解約完了のお知らせ」であること
    - [ ] 本文に利用可能期限（`currentPeriodEnd`）が記載されていること

### 3. 有料プラン移行通知 (Trial End -> Active)
トライアル終了後、本課金が開始されたタイミングでメールが送信されるか確認する。

- **手順**:
    1. Stripe CLIでは状態遷移の再現が難しいため、JSONフィクスチャを使用するか、以下のコマンドで更新イベントを送信し、ログを確認する（擬似確認）。
       ```bash
       stripe trigger customer.subscription.updated
       ```
       *注: CLIのデフォルトトリガーでは `trialing` -> `active` の遷移データを含まない場合があります。確実なテストにはStripe Dashboardでテスト顧客を作成し、トライアル期間を短く設定して（例: テストクロック使用）時間を進めるのが推奨されます。*
- **確認事項**:
    - [ ] `previous_attributes.status === 'trialing'` かつ `status === 'active'` の判定ロジックが機能すること
    - [ ] `sendTrialEndEmail` が送信されること
    - [ ] 受信したメールの件名が「【Karte AI Plus】有料プランへの移行完了のお知らせ」であること
    - [ ] 正しい月額料金と次回請求日が記載されていること

### 4. 決済失敗時の対応 (Payment Failed)
カード有効期限切れや残高不足などで決済が失敗した場合の挙動を確認する。

- **手順**:
    1. Stripe CLIでイベントをトリガー:
       ```bash
       stripe trigger invoice.payment_failed
       ```
    2. または、カスタマーポータルでカード情報を失敗するテストカード（例: `4000 0000 0000 0002`）に変更し、請求を発生させる。
- **確認事項**:
    - [ ] `sendPaymentFailedEmail` が送信されること
    - [ ] 受信したメールの件名が「【重要】お支払いの決済に失敗しました」であること
    - [ ] 本文に「お支払い情報の確認・変更」へのリンクが含まれていること

### 5. アクセス制御 (Access Control)
契約状態に応じた拡張機能の利用可否を確認する。

#### シナリオ A: 解約済みだが期間内
- **前提**: `status: canceled`, `currentPeriodEnd: 未来の日付`
- **確認事項**:
    - [ ] `check-subscription` APIが `active: true` を返すこと
    - [ ] 拡張機能が通常通り利用できること

#### シナリオ B: 期間切れ / 未契約
- **前提**: `status: canceled`, `currentPeriodEnd: 過去の日付` または `status: past_due / unpaid`
- **確認事項**:
    - [ ] `check-subscription` APIが `active: false` を返すこと
    - [ ] 拡張機能のサイドパネルに「⚠️ 利用期限切れ / 未契約」のオーバーレイが表示されること
    - [ ] **「お支払い情報の確認・更新」ボタン**が表示されること
    - [ ] ボタンクリックでカスタマーポータル（または更新ページ）が開くこと

---

## 🗓 検証スケジュール
- [ ] ローカル環境でのCLIテスト: 2025-12-12
- [ ] ステージング/本番環境でのE2Eテスト: 2025-12-13

## 📝 備考
- メール送信には Azure Communication Services が使用されます。テスト時は実際にメールが届くメールアドレスを使用するか、ログで内容を確認してください。

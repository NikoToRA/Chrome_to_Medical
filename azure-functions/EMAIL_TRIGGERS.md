# メール送信トリガーとタイミング

本システムで送信されるメールの種類、送信タイミング、およびトリガーとなる技術的なイベントの一覧です。

| メール種類 | 送信タイミング | トリガー（技術的詳細） |
| :--- | :--- | :--- |
| **1. 登録完了通知 (Welcome Email)** | ユーザーがStripeでカード登録・サブスクリプション作成を完了した直後 | **Stripe Webhook**<br>`checkout.session.completed` イベント受信時 |
| **2. お試し終了予告 (Trial Warning)** | 登録から **10日後** の朝 (トライアル終了4日前) | **Azure Function (Timer Trigger)**<br>`check-trial-warning` 関数が毎日9:00(JST)に実行され、対象ユーザーを抽出 |
| **3. 有料移行完了 (Paid Plan Transition)** | 14日間のトライアル期間が終了し、ステータスが「有効 (Active)」に切り替わった直後 | **Stripe Webhook**<br>`customer.subscription.updated` イベントで<br>`status: trialing` → `active` への変化を検知した時 |
| **4. 領収書送付 (Receipt)** | 初回課金および毎月の更新ごとの決済成功時 | **Stripe Webhook**<br>`invoice.payment_succeeded` イベント受信時<br>(0円決済の場合はスキップ) |
| **5. 決済失敗通知 (Payment Failed)** | クレジットカードの決済が失敗した直後 | **Stripe Webhook**<br>`invoice.payment_failed` イベント受信時 |
| **6. 解約完了通知 (Cancellation)** | ユーザーが拡張機能のアカウント管理画面で「解約」ボタンを押した直後 | **Stripe Webhook**<br>`customer.subscription.updated` イベントで<br>`cancel_at_period_end: false` → `true` への変化を検知した時 |

## 補足事項

### 解約時の挙動について
*   **アクセス権:** 解約操作を行っても、現在の請求期間終了日までは引き続きサービスを利用可能です（即時停止ではありません）。
*   **メール内容:** 解約完了メールには「**[期間終了日] までは引き続き利用可能です**」という案内が含まれます。

### 領収書について
*   PDFファイル（インボイス制度対応）が自動生成され、メールに添付されて送信されます。

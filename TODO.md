# TODO

## プロダクト内で実装すること（Chrome拡張 / Azure Functions）

1. **登録〜認証フロー**
   - LPからメールアドレス・医療機関情報を受け取り、Azure Functionsで仮登録。
   - Magic Link 方式のメール認証 API（登録メール送付、トークン検証）を実装。
   - Chrome拡張のログイン処理を `chrome.storage.local` に保存するトークン方式に統一。

2. **同意・契約フロー**
   - 個人情報保護方針・利用規約への同意チェック＋PDFメール送付を実装。
   - 将来 DocuSign / Adobe Sign に切り替えられるよう、署名ステータスを保持するAPIを用意。

3. **Stripe 試用サブスク**
   - Checkout セッション生成 API（trial 14日, metadata に userId/署名ID）。
   - Webhook で `checkout.session.completed` / `customer.subscription.created` / `deleted` を処理し、ユーザーステータス更新。
   - `check-subscription` 関数を拡張し、試用中・解約済み・課金中のステータスを返す。
   - 試用終了48h前のリマインダメール送信ジョブ（Timer Function or Logic Apps）。

4. **解約フロー**
   - 解約LP向け API：メール入力→ワンタイムコード送信→Stripeサブスクキャンセル→Azure状態更新。
   - `customer.subscription.deleted` Webhook と整合を取る。

5. **ログ/データ管理**
   - clinical-insertions の JSON をユーザーID・契約ステータスと紐付けるメタデータテーブル。
   - 解約後に生データを削除するバッチ（Timer Function）を実装。

6. **将来のRAG準備**
   - clinical-insertions ログに `phi` ラベルや `embeddingOptIn` を付与。
   - Embedding パイプライン用の Azure Function 雛形（JSON→テキスト整形→Azure AI Search等）を用意。

## プロダクト外で対応が必要なこと

1. **LP制作 & コピー**
   - 一般的なSaaS導線でのLPデザイン/コーディング、CTA→登録フォーム→認証完了ページまで。
   - FAQ/料金表/導入事例などマーケ素材。

2. **メール/通知基盤**
   - SendGrid or Azure Communication Services の送信ドメイン設定、テンプレ作成（登録確認、署名案内、試用開始/終了、請求書、解約完了など）。

3. **署名/契約運用**
   - DocuSign/Adobe Sign/CloudSign などのサービス契約、テンプレート準備、Webhook設定。

4. **Stripe設定**
   - 価格/プラン作成、試用期間付きサブスク設定、ダッシュボード上の税設定・請求書設定。

5. **解約用LP**
   - UX/文言設計（即時解約or末日、サポート窓口表示、FAQ）。

6. **社内運用・コンプライアンス**
   - Microsoft/Azureベースでのセキュリティポリシー整備、社内運用フロー（問い合わせ、請求管理）。

7. **将来のEmbedding/RAG**
   - Azure AI Search などのリソース準備、匿名化ルール・データ保管期間の決定。

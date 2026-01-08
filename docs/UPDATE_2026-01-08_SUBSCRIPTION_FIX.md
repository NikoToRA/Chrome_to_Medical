# アップデート内容 - 2026年1月8日

## 概要
サブスクリプション管理の不具合修正、トライアル警告システムの改善、UI/UXの統一を実施。

---

## 1. サブスクリプション管理の修正

### 問題
- `trialEnd`がDBに保存されておらず、14日経過で強制ログアウトが発生
- 既存ユーザー22名が影響を受けた

### 解決策
- `stripe-webhook/index.js`: Stripeの`trial_end`をDBに保存するよう修正
- `check-subscription/index.js`: DB内の`trialEnd`を使用して判定するよう修正
- `fix_trial_users.js`: 既存ユーザーの`trialEnd`を修復するスクリプト作成・実行

### 判定ロジック
```javascript
if (status === 'active') {
    isActive = periodEnd > now;
} else if (status === 'trialing') {
    isActive = trialEnd ? trialEnd > now : periodEnd > now;
} else if (status === 'canceled') {
    isActive = periodEnd > now; // 期間終了まで利用可能
}
```

---

## 2. Stripe同期 + トライアル警告の統合

### 変更前
- `sync-stripe-subscriptions`: 12:00 JST実行（Stripe同期のみ）
- `check-trial-warning`: 別途実行（10日後に警告メール）

### 変更後
- `sync-stripe-subscriptions`: 9:00 JST実行（統合バッチ）
  - Phase 1: Stripeから全サブスクリプション同期
  - Phase 2: trialEnd 2日前のユーザーに警告メール送信
- `check-trial-warning`: 削除

### スケジュール
```
0 0 0 * * *  (UTC) = 9:00 JST
```

---

## 3. ランディングページの改修

### 色変更
- 背景グラデーション: 紫系 → ブルー系
  - `#667eea` → `#2563eb`
  - `#764ba2` → `#0891b2`

### 再ログインページ追加
- URL: `https://stkarteai1763705952.z11.web.core.windows.net/#/login`
- 登録ページ下部に「既にご登録済みの方 → 再ログイン」リンク追加

### Vite設定修正
- `base`: `/register/` → `/`（アセットパス修正）

---

## 4. メールテンプレートの改修

### Magic Linkメール
- 件名: 「ログイン用リンクをお送りします」
- ボタン: 「ログインして決済手続きを進める」→「ログインする」
- 色: 紫 → ブルー (#2563eb)

### トライアル警告メール
- 件名: 「お試し期間があと2日で終了します」
- 送信タイミング: トライアル終了2日前
- 終了日を明記

---

## 5. 拡張機能の改修 (v0.2.3)

### ログイン画面の改善
```
┌─────────────────────────────────┐
│ 🔒 ログインが必要です           │
│                                 │
│ [新規登録ページへ]              │  ← 新規ユーザー向け
│ 決済完了後、自動的にログイン     │
│                                 │
│ [既にアカウントをお持ちの方      │  ← 新規追加
│   → 再ログイン]                 │
└─────────────────────────────────┘
```

### リンク色統一
- `#667eea` → `#2563eb`

---

## 6. 解約機能の動作確認

### テスト結果
- テストアカウント: super206cc@gmail.com
- cancel-subscription API: 正常動作
- Stripeの`cancel_at_period_end`: `true`に設定される
- ユーザーは期間終了まで利用可能

---

## デプロイ済みファイル

### Azure Functions
- auth-send-magic-link/index.js
- check-subscription/index.js
- stripe-webhook/index.js
- sync-stripe-subscriptions/index.js
- lib/table.js
- utils/email.js
- config/company.json

### Azure Blob Storage (Landing Page)
- index.html
- assets/index-CENaj8Ou.js
- assets/index-DjSGTlQC.css

### Chrome Web Store (準備完了)
- karte-ai-plus-v0.2.3.zip

---

## Git Commits
1. `db3a0b68` - feat: トライアル警告とStripe同期を統合、LP色変更
2. `e9ac34da` - feat: 拡張機能に再ログインボタン追加 (v0.2.3)

---

## ユーザー案内用URL

| 用途 | URL |
|------|-----|
| 新規登録 | https://stkarteai1763705952.z11.web.core.windows.net/ |
| 再ログイン | https://stkarteai1763705952.z11.web.core.windows.net/#/login |

---

## 今後の運用

1. **毎日9:00 JST**: sync-stripe-subscriptionsが自動実行
   - Stripeデータ同期
   - トライアル終了2日前の警告メール送信

2. **ログアウトユーザー対応**: 再ログインURLを案内

3. **解約**: 期間終了まで利用可能、即時停止ではない

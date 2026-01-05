# 🎯 Stripe決済から拡張機能利用までの完全ガイド

**作成日**: 2025-11-30  
**目的**: 決済から拡張機能獲得までの全ステップを確認

---

## 📍 現在地の確認

あなたは今、以下のどこにいますか？

```
✅ Step 1: Landing Pageでメールアドレス入力完了
✅ Step 2: Magic Link送信完了
🔄 Step 3: メールからMagic Linkをクリック ← 次のステップ
⏸️ Step 4: Stripe決済ページ
⏸️ Step 5: 決済完了
⏸️ Step 6: Success Page
⏸️ Step 7: 拡張機能の獲得・インストール
⏸️ Step 8: 拡張機能でログイン
⏸️ Step 9: 利用開始
```

---

## 🔄 今から進むステップ詳細

### Step 3: Magic Linkをクリック

**やること**:
1. `super206cc@gmail.com` のメールボックスを開く
2. 「Karte AI+ ログインリンク」のようなタイトルのメールを探す
3. メール内のリンクをクリック

**クリックすると何が起こる？**:
```
[Magic Link URL]
https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGci...
    ↓
[バックエンド処理]
1. トークンを検証
2. メールアドレスを抽出: super206cc@gmail.com
3. Stripe Checkout Session作成
4. Stripeページへリダイレクト
    ↓
[Stripeページに自動移動]
```

---

### Step 4: Stripe決済ページ

**表示される情報**:
- 商品名: Karte AI+ （または設定した名前）
- 金額: 14日間無料、その後 ¥X,XXX/月
- メールアドレス: super206cc@gmail.com（既に入力済み）

**入力するもの（テストモード）**:

```
カード情報:
  カード番号: 4242 4242 4242 4242
  有効期限: 12/34 (任意の未来の日付)
  CVC: 123 (任意の3桁)
  
請求先情報:
  名前: 平山 傑
  郵便番号: 123-4567
  住所: 東京都渋谷区1-1-1
```

**「購読する」ボタンをクリック**

---

### Step 5: 決済完了（バックグラウンド処理）

**ユーザーには見えない処理**:

```
[Stripe]
    ↓
1. 決済処理（テストモードなので即座に成功）
    ↓
2. Webhook送信
    ↓
[Azure Functions: stripe-webhook]
    ↓
3. イベント受信: checkout.session.completed
    ↓
4. Azure Table Storageに保存:
   - Email: super206cc@gmail.com
   - Status: active
   - StripeCustomerId: cus_xxxxx
   - CurrentPeriodEnd: 2025-12-14 (14日後)
    ↓
✅ 購読データ保存完了
```

---

### Step 6: Success Pageへリダイレクト

**自動的に移動**:
```
URL: https://stkarteai1763705952.z11.web.core.windows.net/success?token=eyJhbGci...&session_id=cs_test_xxx
```

**Success Pageに表示されるべき内容**:

```
✅ 登録完了！

お支払いが完了しました。
14日間の無料トライアルを開始しました。

次のステップ：
1. Chrome拡張機能をインストール
2. 自動的にログインされます

[Chrome拡張機能をインストール] ボタン
```

**現状の問題**: ⚠️ このSuccess Pageが未実装または不完全

---

### Step 7: 拡張機能の獲得方法

#### 🔴 現在の状況（開発中）

**方法1: ローカルで読み込む（開発者モード）**

```
1. Chromeで chrome://extensions/ を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトのルートディレクトリを選択
   /Users/suguruhirayama/Chrome_to_Medical/
5. 拡張機能が読み込まれる
```

**メリット**:
- ✅ すぐに使える
- ✅ コード変更がリアルタイムで反映

**デメリット**:
- ❌ 一般ユーザーには使えない
- ❌ 毎回手動で読み込む必要がある

---

**方法2: ZIPファイルで配布（非推奨）**

```
1. プロジェクトをZIP化
2. ユーザーにダウンロードしてもらう
3. chrome://extensions/ で読み込み
```

**メリット**:
- ✅ Web Storeなしで配布可能

**デメリット**:
- ❌ セキュリティ警告が出る
- ❌ 自動更新されない
- ❌ ユーザー体験が最悪

---

#### 🟢 本番環境（Chrome Web Store公開後）

**方法3: Chrome Web Storeからインストール（推奨）**

```
1. Success Pageに「拡張機能をインストール」ボタン
   ↓
2. Chrome Web Storeのページへ移動
   URL: https://chrome.google.com/webstore/detail/{EXTENSION_ID}
   ↓
3. 「Chromeに追加」ボタンをクリック
   ↓
4. 自動インストール完了
```

**メリット**:
- ✅ ワンクリックでインストール
- ✅ 自動更新
- ✅ セキュリティ警告なし
- ✅ 一般ユーザーに配布可能

---

## 🏪 Chrome Web Store公開のタイミング

### 📅 公開すべきタイミング

#### ✅ 公開前に必須の条件

```
1. 機能が完成している
   ✅ Magic Link認証
   ✅ Stripe決済
   🔄 自動ログイン（未完成）
   ✅ AI機能
   ✅ EMR連携（CLINICS）

2. ドキュメントが揃っている
   ✅ README.md
   🔄 プライバシーポリシー（要作成）
   🔄 利用規約（要作成）
   
3. ストアリスティングの準備
   🔄 アイコン（128x128など）
   🔄 スクリーンショット（5枚推奨）
   🔄 説明文
   🔄 プロモーション画像

4. テストが完了している
   🔄 エンドツーエンドテスト
   🔄 複数環境でのテスト
```

---

### 🎯 推奨タイミング

#### Phase 1: 社内テスト（現在）

**タイミング**: 今すぐ〜1週間後

**やること**:
1. ローカルで拡張機能を読み込み
2. Stripe決済テスト
3. 基本機能テスト
4. バグ修正

**配布方法**: デベロッパーモード

---

#### Phase 2: クローズドベータ（1-2週間後）

**タイミング**: 自動ログイン実装完了後

**やること**:
1. 信頼できるユーザー5-10人に配布
2. フィードバック収集
3. バグ修正
4. プライバシーポリシー・利用規約作成

**配布方法**: 
- デベロッパーモード
- または非公開リンク（Chrome Web Store Draft）

---

#### Phase 3: Chrome Web Store公開（2-4週間後）

**タイミング**: 
- ✅ 自動ログイン完成
- ✅ プライバシーポリシー完成
- ✅ 利用規約完成
- ✅ ストアリスティング完成
- ✅ クローズドベータで大きなバグなし

**やること**:
1. Chrome Web Store Developer Dashboardに登録
2. 拡張機能をアップロード
3. 審査を待つ（通常1-3日）
4. 公開

**配布方法**: Chrome Web Store（一般公開）

---

## 📦 Chrome Web Store公開の手順

### 準備するもの

#### 1. 必須ファイル

```
プロジェクトルート/
├── manifest.json ✅（既にある）
├── icons/
│   ├── icon16.png 🔄（要作成）
│   ├── icon48.png 🔄（要作成）
│   └── icon128.png 🔄（要作成）
├── background.js ✅
├── content/
├── sidepanel/
├── options/
└── README.md ✅
```

#### 2. ストアリスティング用素材

```
必要なもの:
1. アイコン（PNG）
   - 16x16px
   - 48x48px
   - 128x128px（最重要）

2. スクリーンショット（PNG/JPEG）
   - 1280x800px または 640x400px
   - 最低1枚、推奨5枚
   - 実際の使用画面

3. プロモーション画像（オプション）
   - Small: 440x280px
   - Large: 920x680px
   - Marquee: 1400x560px

4. 説明文
   - 短い説明（132文字以内）
   - 詳細説明（16,000文字以内）

5. カテゴリ
   - 推奨: 「生産性」
```

#### 3. 法的文書

```
必須:
1. プライバシーポリシー
   - 収集するデータ
   - データの使用目的
   - データの保管方法
   - 第三者への共有（Stripe、Azure）
   
2. 利用規約
   - サービス内容
   - 料金
   - 返金ポリシー
   - 免責事項
```

---

### 公開手順（詳細）

#### Step 1: Developer Dashboard登録

```
1. https://chrome.google.com/webstore/devconsole にアクセス
2. Googleアカウントでログイン
3. 初回のみ: 登録費用 $5（一度だけ）
4. デベロッパーアカウント作成
```

---

#### Step 2: 拡張機能をパッケージング

**方法A: ZIPで作成（推奨）**

```bash
# プロジェクトルートで実行
cd /Users/suguruhirayama/Chrome_to_Medical

# 必要なファイルだけをZIP化
zip -r karte-ai-plus.zip \
  manifest.json \
  background.js \
  content/ \
  sidepanel/ \
  options/ \
  offscreen/ \
  utils/ \
  icons/ \
  defaults/ \
  -x "*.git*" "node_modules/*" "*.md" "azure-functions/*" "landing-page/*"
```

**方法B: Chrome Developer Dashboardで直接アップロード**

```
1. Developer Dashboardで「New Item」をクリック
2. ZIPファイルをアップロード
3. または、ディレクトリを選択
```

---

#### Step 3: ストアリスティング入力

```
必須項目:
1. アプリ名: Karte AI+
2. 概要（短）: 
   「医療記録のAIアシスタント。CLINICSなどのEMRで、AI定型文生成や文書作成を支援します。」
   
3. 詳細説明:
   【書く内容】
   - 何ができるか
   - 対応EMR
   - 料金（14日無料、その後¥XXX/月）
   - 使い方
   
4. カテゴリ: 生産性
5. 言語: 日本語
6. プライバシーポリシーURL:
   https://stkarteai1763705952.z11.web.core.windows.net/privacy
```

---

#### Step 4: スクリーンショット追加

**推奨スクリーンショット**:

```
1. メイン画面: サイドパネルでAI生成している様子
2. 定型文リスト: AI Agents一覧
3. CLINICS連携: EMRに挿入している様子
4. 設定画面: オプション画面
5. ログイン画面: Magic Link認証の説明
```

---

#### Step 5: プライバシー関連

```
質問に答える:

1. ユーザーデータを収集しますか？ → YES
   - メールアドレス
   - 購読情報
   
2. 個人を特定できる情報を使用しますか？ → YES
   - メールアドレス
   
3. データは暗号化されますか？ → YES
   - HTTPS通信
   - Azure Storage（暗号化）
   
4. データを販売しますか？ → NO

5. プライバシーポリシーのURL → 
   https://stkarteai1763705952.z11.web.core.windows.net/privacy
```

---

#### Step 6: 審査提出

```
1. すべての項目を入力
2. 「Preview」で確認
3. 「Submit for Review」をクリック
4. 審査待ち（通常1-3日、最大7日）
```

---

#### Step 7: 公開

```
審査通過後:
1. 「Publish」ボタンが表示される
2. クリックして公開
3. 数時間後、Chrome Web Storeで検索可能になる
```

---

## 🎯 現在の状況に応じた推奨アクション

### 今すぐできること（今日）

```
1. ✅ Stripe決済テスト
   → Magic Linkクリック → Stripe入力 → Success Page確認

2. ✅ ローカルで拡張機能を読み込み
   → chrome://extensions/ でテスト

3. ✅ 手動ログインテスト
   → 拡張機能でsuper206cc@gmail.comでログイン
   → check-subscription APIで購読確認

4. 📊 データ確認
   → Azure Table Storageで購読データ確認
```

---

### 今週中にやるべきこと

```
1. 🔴 自動ログイン実装（最優先）
   - manifest.jsonにexternally_connectable追加
   - Success Page実装
   - Chrome拡張機能実装

2. 📝 プライバシーポリシー作成
   - テンプレート使用
   - Azure Communication Services記載
   - Stripe記載

3. 📝 利用規約作成
   - 料金明記
   - 返金ポリシー
   - 免責事項

4. 🎨 アイコン作成
   - 16x16, 48x48, 128x128
   - デザインツールまたは発注
```

---

### 来週以降

```
1. 📸 スクリーンショット撮影
2. 📝 ストアリスティング執筆
3. 🧪 クローズドベータ
4. 🚀 Chrome Web Store申請
```

---

## 📊 タイムライン（推奨）

```
Week 1 (今週):
├─ 今日: Stripe決済テスト完了
├─ 明日: 自動ログイン実装開始
└─ 金曜: プライバシーポリシー・利用規約作成

Week 2:
├─ 月曜: 自動ログイン完成
├─ 水曜: アイコン・スクリーンショット完成
└─ 金曜: ストアリスティング完成

Week 3:
├─ 月曜: クローズドベータ開始
├─ 水曜: フィードバック収集
└─ 金曜: バグ修正

Week 4:
├─ 月曜: Chrome Web Store申請
├─ 水曜: 審査待ち
└─ 金曜: 🎉 公開！
```

---

## 🎬 次のアクション

### 今すぐやること

1. **Magic Linkメールを開く**
   - super206cc@gmail.com のメールボックス確認
   - Magic Linkをクリック

2. **Stripeページで決済**
   - テストカード: 4242 4242 4242 4242
   - 決済完了まで進む

3. **Success Page確認**
   - どんな画面が表示されるか確認
   - トークンが含まれているか確認

4. **ローカルで拡張機能読み込み**
   ```
   chrome://extensions/
   → デベロッパーモード ON
   → パッケージ化されていない拡張機能を読み込む
   → /Users/suguruhirayama/Chrome_to_Medical/ 選択
   ```

5. **手動ログイン**
   - 拡張機能を開く
   - super206cc@gmail.com でログイン
   - 動作確認

---

## 📝 まとめ

### Chrome Web Store公開のタイミング

**答え: 2-4週間後が理想**

**理由**:
1. 自動ログイン実装が必要（最優先）
2. プライバシーポリシー・利用規約が必須
3. ストアリスティング準備に時間がかかる
4. クローズドベータでバグ修正

**今すぐ公開できない理由**:
- ❌ 自動ログインが未実装（UXが悪い）
- ❌ プライバシーポリシーなし（審査落ち確定）
- ❌ アイコン・スクリーンショット未準備

---

**では、Magic Linkメールを開いて、Stripe決済を進めましょう！** 🚀



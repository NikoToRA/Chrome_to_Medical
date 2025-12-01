# Chrome Web Store 公開チェックリスト
作成日: 2025-12-01

## 📋 公開前の準備チェックリスト

### 1. 拡張機能のパッケージング ✅
- [x] `extensions/` ディレクトリに必要なファイルが揃っている
- [x] `manifest.json` が正しく設定されている
- [ ] **アイコン画像の準備と設定**
  - [ ] 16x16 PNG（オプション）
  - [ ] 48x48 PNG（オプション）
  - [ ] 128x128 PNG（必須：Chrome Web Store表示用）
  - [ ] `manifest.json` に `icons` フィールドを追加
- [ ] **スクリーンショットの準備**
  - [ ] 1280x800 または 640x400 PNG（最大5枚）
  - [ ] 拡張機能の主要機能を説明する画像
  - [ ] 日本語と英語の両方（可能であれば）

### 2. プライバシーとセキュリティ
- [ ] **プライバシーポリシーの作成**
  - [ ] プライバシーポリシーページの作成（HTML）
  - [ ] 公開可能なURLに配置
  - [ ] データ収集の開示（必要な場合）
  - [ ] 推奨URL: `https://stkarteai1763705952.z11.web.core.windows.net/privacy`
- [ ] **利用規約の作成**
  - [ ] 利用規約ページの作成（HTML）
  - [ ] 公開可能なURLに配置
  - [ ] 推奨URL: `https://stkarteai1763705952.z11.web.core.windows.net/terms`
- [ ] **データ収集の開示**
  - [ ] 収集するデータの種類を明確化
  - [ ] データの使用方法を説明
  - [ ] データの保存期間を明記

### 3. ストアリスティング情報
- [ ] **基本情報**
  - [ ] 拡張機能名: "Karte AI+"
  - [ ] 説明文（日本語）: クラウド型電子カルテ向けサポート拡張機能 - AIによる診療記録作成支援と固定文挿入で医療現場の業務を効率化
  - [ ] 説明文（英語）: Cloud-based EMR support extension - AI-powered medical record creation assistance and template insertion to streamline healthcare workflows
  - [ ] カテゴリ: Productivity（生産性）
  - [ ] 言語: 日本語、英語
- [ ] **詳細説明**
  - [ ] 機能の詳細説明（日本語）
  - [ ] 機能の詳細説明（英語）
  - [ ] 使用方法の説明
  - [ ] 対象ユーザーの説明
- [ ] **スクリーンショット**
  - [ ] スクリーンショット1: メイン画面
  - [ ] スクリーンショット2: AIチャット機能
  - [ ] スクリーンショット3: 定型文管理
  - [ ] スクリーンショット4: テキスト編集機能
  - [ ] スクリーンショット5: （オプション）

### 4. 技術的な確認
- [x] `manifest.json` のバージョン番号: 0.1.0
- [x] 必要な権限の最小化
- [ ] **エラーハンドリングの確認**
  - [ ] ネットワークエラーの処理
  - [ ] 認証エラーの処理
  - [ ] ユーザーフレンドリーなエラーメッセージ
- [ ] **パフォーマンスの確認**
  - [ ] 拡張機能の起動速度
  - [ ] メモリ使用量
  - [ ] CPU使用量
- [ ] **セキュリティの確認**
  - [ ] CSP（Content Security Policy）の確認
  - [ ] 外部リソースの読み込み確認
  - [ ] データの暗号化（必要な場合）

### 5. Chrome Web Store Developer Dashboard
- [ ] **アカウント設定**
  - [ ] Googleアカウントでログイン
  - [ ] $5 の登録料を支払い（初回のみ）
  - [ ] 開発者情報を入力
- [ ] **拡張機能のアップロード**
  - [ ] ZIPファイルをアップロード: `karte-ai-plus.zip`
  - [ ] ストアリスティング情報を入力
  - [ ] プライバシーポリシーURLを設定
  - [ ] 利用規約URLを設定（オプション）
  - [ ] サポートURLを設定（オプション）
- [ ] **審査提出**
  - [ ] すべての情報を確認
  - [ ] 審査を提出
  - [ ] 審査完了を待つ（通常1-3営業日）

## 📝 必要なファイル一覧

### 拡張機能ファイル
- [x] `extensions/manifest.json`
- [x] `extensions/background.js`
- [x] `extensions/sidepanel/` (HTML, CSS, JS)
- [x] `extensions/content/` (content scripts)
- [x] `extensions/utils/` (utility files)
- [x] `extensions/options/` (options page)
- [ ] `extensions/icons/icon-16.png` (オプション)
- [ ] `extensions/icons/icon-48.png` (オプション)
- [ ] `extensions/icons/icon-128.png` (必須)

### ドキュメント
- [ ] プライバシーポリシー（HTML）
- [ ] 利用規約（HTML）
- [ ] スクリーンショット（PNG、最大5枚）

### パッケージ
- [x] `karte-ai-plus.zip` (作成済み)

## 🎯 優先度別タスク

### 🔴 最優先（公開前に必須）
1. **アイコン画像の設定**
   - `manifest.json` に `icons` フィールドを追加
   - 128x128 PNG アイコンを配置
2. **プライバシーポリシーの作成**
   - HTMLページを作成
   - 公開可能なURLに配置
3. **スクリーンショットの準備**
   - 最低1枚（1280x800 または 640x400）
   - 拡張機能の主要機能を説明

### 🟡 重要（公開前に推奨）
1. **利用規約の作成**
2. **詳細説明文の作成**（日本語・英語）
3. **複数のスクリーンショット**（3-5枚）

### 🟢 通常（公開後でも可）
1. 多言語対応の強化
2. マーケティング資料の作成
3. ユーザーガイドの作成

## 📋 次のセッションでやること

1. **アイコン画像の確認と設定**
   - `extensions/icons/` ディレクトリの画像を確認
   - `manifest.json` に `icons` フィールドを追加
   - アイコンが正しく表示されるか確認

2. **プライバシーポリシーページの作成**
   - `landing-page/` に `privacy.html` を作成
   - データ収集の開示
   - Azure Storage にデプロイ

3. **利用規約ページの作成**
   - `landing-page/` に `terms.html` を作成
   - サービス利用条件を記載
   - Azure Storage にデプロイ

4. **スクリーンショットの準備**
   - 拡張機能の主要機能をキャプチャ
   - 画像サイズを調整（1280x800 または 640x400）
   - PNG形式で保存

5. **Chrome Web Store Developer Dashboard での作業**
   - アカウント設定（初回のみ）
   - 拡張機能のアップロード
   - ストアリスティング情報の入力
   - 審査提出

## 📌 注意事項

- 審査には通常 **1-3営業日** かかります
- 審査が却下された場合は、理由を確認して修正後、再提出が必要です
- プライバシーポリシーは必須です。データを収集しない場合でも、その旨を明記する必要があります
- アイコンは128x128が必須です。16x16と48x48はオプションですが、推奨されます

## 🔗 参考リンク

- Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Chrome拡張機能の公開ガイド: https://developer.chrome.com/docs/webstore/publish
- プライバシーポリシーのテンプレート: https://developer.chrome.com/docs/webstore/user-data

# Chrome Web Store 公開ガイド

## 現状の判断
自動ログイン機能は複雑で、Chrome Web Storeに公開されていない状態では動作しない可能性が高いため、**Chrome Web Storeに公開して、手動でトークンを貼り付ける方法に集中**します。

## 公開前の準備チェックリスト

### 1. 拡張機能のパッケージング
- [x] `extensions/` ディレクトリに必要なファイルが揃っている
- [x] `manifest.json` が正しく設定されている
- [ ] アイコン画像の準備（16x16, 48x48, 128x128）
- [ ] スクリーンショットの準備（1280x800 または 640x400）

### 2. プライバシーとセキュリティ
- [ ] プライバシーポリシーの作成
- [ ] 利用規約の作成
- [ ] データ収集の開示（必要な場合）

### 3. ストアリスティング
- [ ] 拡張機能の説明文（日本語・英語）
- [ ] スクリーンショット（最大5枚）
- [ ] カテゴリの選択
- [ ] サポートURLの設定

### 4. 技術的な確認
- [x] `manifest.json` のバージョン番号
- [x] 必要な権限の最小化
- [ ] エラーハンドリングの確認
- [ ] パフォーマンスの確認

## 公開手順

### Step 1: Chrome Web Store Developer Dashboard にアクセス
1. https://chrome.google.com/webstore/devconsole にアクセス
2. Googleアカウントでログイン
3. 初回は $5 の登録料が必要

### Step 2: 拡張機能をパッケージング
```bash
cd /Users/suguruhirayama/Chrome_to_Medical/extensions
zip -r ../karte-ai-plus.zip . -x "*.DS_Store" "*.git*"
```

### Step 3: ストアリスティング情報の入力
- **名前**: Karte AI+
- **説明**: クラウド型電子カルテ向けサポート拡張機能 - AIによる診療記録作成支援と固定文挿入で医療現場の業務を効率化
- **カテゴリ**: Productivity
- **言語**: 日本語、英語

### Step 4: プライバシーとセキュリティ
- プライバシーポリシーURL: `https://stkarteai1763705952.z11.web.core.windows.net/privacy`
- 利用規約URL: `https://stkarteai1763705952.z11.web.core.windows.net/terms`

### Step 5: スクリーンショットとアイコン
- アイコン: 128x128 PNG
- スクリーンショット: 1280x800 または 640x400 PNG

### Step 6: 審査提出
- 拡張機能のZIPファイルをアップロード
- ストアリスティング情報を入力
- 審査を提出

## 審査後の動作フロー

1. **ユーザーがLanding Pageで登録**
   - メールアドレスを入力
   - Magic Link送信

2. **メールからMagic Linkをクリック**
   - トークン発行
   - Stripe決済

3. **Success Pageでトークンを取得**
   - トークンが表示される
   - 手動でコピー

4. **Chrome Web Storeから拡張機能をインストール**
   - Chrome Web Storeのリンクからインストール
   - 拡張機能を開く

5. **拡張機能にトークンを貼り付け**
   - サイドパネルを開く
   - トークンを貼り付けて送信
   - AI機能が使用可能になる

## 注意事項

- 自動ログイン機能は一旦保留（Chrome Web Store公開後に再検討）
- 手動トークン貼り付け機能は既に実装済み
- プライバシーポリシーと利用規約のページをLanding Pageに追加する必要がある

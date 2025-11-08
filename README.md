# Chrome to X

Chrome拡張機能で、サイドバーからテキストと画像を編集・管理し、X（旧Twitter）、Facebook、MicroCMSなど複数のプラットフォームに投稿するためのコンテンツを作成するツール。

## 機能

### Phase 1: 基本機能（実装済み）
- ✅ サイドバー表示機能（Side Panel API）
- ✅ テキスト編集機能（140文字超で警告表示）
- ✅ 画像追加機能（最大4枚まで）
- ✅ ハッシュタグ管理機能
- ✅ テキストコピー機能

### Phase 2以降（未実装）
- ウェブページへのテキスト貼り付け
- ドラッグ&ドロップ画像取り込み
- スクリーンショット機能
- AI機能統合（Claude API）
- マルチプラットフォーム対応

## インストール方法

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. このディレクトリを選択

## 使用方法

1. Chrome拡張機能のアイコンをクリックしてサイドパネルを開く
2. テキストを入力・編集
3. 画像を追加（最大4枚）
4. ハッシュタグを管理・挿入
5. 「テキストをコピー」または「すべてをコピー」ボタンでクリップボードにコピー
6. XやFacebookなどの投稿画面に貼り付け

## ファイル構成

```
Chrome_to_X/
├── manifest.json          # 拡張機能の設定ファイル
├── background.js          # バックグラウンドスクリプト
├── sidepanel/            # サイドパネル
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
├── content/              # コンテンツスクリプト
│   └── content.js
├── options/              # 設定画面
│   ├── options.html
│   ├── options.css
│   └── options.js
├── icons/                # アイコンファイル
└── utils/                # ユーティリティ
    ├── storage.js
    └── image.js
```

## 要件

- Chrome 114以上（Side Panel API対応）

## 開発

詳細な要件定義は `backlog.md` を参照してください。

## ライセンス

MIT License

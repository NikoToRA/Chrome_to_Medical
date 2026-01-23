# LP2 - 新ランディングページ開発ガイドライン

## 概要

LP2は新しいランディングページプロジェクトです。

## ワークルール

### 絶対に守るべきルール

**`/Users/suguruhirayama/Chrome_to_Medical/landing-page-new` の中身を変更してはいけません。**

- 参考ディレクトリ（landing-page-new）は読み取り専用として扱う
- 新機能・修正は全てLP2ディレクトリ内で行う
- landing-page-newのファイルを直接編集しない
- landing-page-newへのシンボリックリンクを作成しない

### 許可されている操作

- LP2ディレクトリ内のファイルの作成・編集・削除
- landing-page-newのファイルを参考として読み取る（Readのみ）
- landing-page-newの構造やコードを参考にして新しいコードを書く
- **画像参照は常に許可** - ユーザーから提供された画像は確認不要で参照可能

### 禁止されている操作

- landing-page-new内のファイルへのWrite/Edit操作
- landing-page-newのファイルの削除
- landing-page-newへの新規ファイル追加

## 画像アセット

LP2で使用可能な画像（`/public/images/`配下）:

### agents/
- Agent-center.jpg
- Agent-discussion.jpg
- Agent-invoice.jpg
- Agent-inyroduction.jpg
- Agent-soap.jpg

### doctors/
- doctor-1.png
- doctor-2.png
- doctor-3.png

### future/
- dostor_waiting.png
- family_future.png
- ivitation_future2.png
- Nurse_happy.png

### pain-points/
- family_4.png
- invitation_3.png
- nurse_2.png
- outpatient_1.png
- family.svg, hospital.svg, patient.svg, staff.svg

### logos/
- logo-1.svg, logo-2.png, logo-3.png

### usage/
- usage-agent.mp4
- usage_complete_v2.mp4
- usage_text.mp4

### ルート（/public/）
- Hero3.png, hero-v3.png, heroimagev2.png
- hero-image.jpeg
- before-after.png
- logo.png, favicon.png
- extension-icon.png

## LP構成（参考画像より）

1. ヒーロー: 「簡単AI導入で、記録時間を1/3に。」
2. 問題提起: 3つのペインポイントカード
3. 解決策: 「その悩み、Karte AIで解決！」
4. 対応電子カルテ
5. 3つの機能カード
6. ベネフィット: 「もう、誰も待たせない。AIが理想の経営を叶えます」
7. 導入クリニックの声（4カード）
8. 機能紹介（デモ動画エリア）
9. 機能詳細（AIエージェント + 定型文）
10. 導入3STEP
11. 料金プラン

## 技術スタック

- React 18
- Vite
- React Router DOM
- Framer Motion

## 開発コマンド

```bash
cd LP2
npm run dev     # 開発サーバー起動
npm run build   # ビルド
npm run preview # プレビュー
```

## 参考ディレクトリ

参考として `/Users/suguruhirayama/Chrome_to_Medical/landing-page-new` を使用できます。
ただし、**読み取り専用**として扱ってください。

# 漫画制作ワークフロー (Manga Production Workflow)

AIカルテ＋説明漫画シリーズを制作するための標準プロセスです。各話は「4ページ読み切り」を基本とします。

## 1. 企画・カリキュラム確認 (Plan)
- `manga/story/customer_journey.md` のカリキュラムを参照し、その回のテーマ（学習目標）を決める。
- 例：「第2話：基本入力とSOAP変換」「第3話：紹介状の作成」

## 2. プロット作成 (Plotting)
- `manga/story/chapterX/plot.md` を作成する。
- 起承転結（Ki-Sho-Ten-Ketsu）で4ページの構成を練る。
    - **Page 1 (起)**: 課題の提示・導入
    - **Page 2 (承)**: AIエージェントによる解決策の提示
    - **Page 3 (転)**: 具体的な操作・デモ（一番の見せ場）
    - **Page 4 (結)**: 解決・ハッピーエンド・次の学びへの意欲

## 3. ページ分割・ネーム構成 (Breakdown)
- プロットをページごとのファイルに分割する。
    - `manga/story/chapterX/page1.md` 〜 `page4.md`
- 各コマの**絵の構成**（Visual）と**セリフ**（Dialogue）を確定させる。
- **重要**: 1ページあたり4〜6コマを推奨。

## 4. 画像生成 (Image Generation)
- `manga/comic/style_guide.md` のルールに従って画像を生成する。
- **保存先**: `manga/comic/chapterX/`
- **ファイル名**: `page1_panel1.png` のように規則的に命名する。
- 必ず「Simple Flat Color Manga Style」を指定し、キャラクターの一貫性を保つこと。

## 5. 編集・仕上げ (Assembly)
- 生成された画像にセリフ（吹き出し）を配置する（外部ツールまたは手動編集）。
- 完成したページを `manga/comic/chapterX/finished_page1.png` として保存する。

---
**エージェントの役割**:
制作進行に迷ったら、Manga Management Agentに「次はどうすればいい？」と聞いてください。このワークフローに基づいて次のステップを案内します。

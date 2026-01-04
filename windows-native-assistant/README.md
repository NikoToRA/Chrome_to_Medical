# Windows Native Assistant (for EMS MAPS) - Docs

本ディレクトリは、Chrome拡張で実現している「ワンプッシュでAIを呼び、結果を電子カルテへ差し込む」体験を、**Windows常駐アプリ**として実現するための要件・設計ドキュメントを管理します。

## 目的（MVP）

- EMSのMAPS（Windowsネイティブに見えるクライアント）を最初のターゲットとし、
- **ホットキー / ボタン 1回**でAI生成を実行し、
- 生成結果を **ユーザー操作なしで** MAPSの「カーソルが当たっている入力箇所」へ**自動貼り付け**する。

## 参照

- 要件定義: `requirements/requirements_definition.md`
- 操作フロー: `requirements/user_flow.md`
- 受入基準: `requirements/acceptance_criteria.md`
- 用語集: `requirements/glossary.md`
- 基本設計: `design/basic_design.md`

## 開発ルール

- 本アプリ（Windows Native Assistant）の開発成果物は **このディレクトリ（`windows-native-assistant/`）配下のみ** に追加する
- 既存のChrome拡張（`extensions/` 等）やLP（`landing-page*/`）へは影響を与えない（必要になったら別途相談）

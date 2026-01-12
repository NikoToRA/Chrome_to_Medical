# Karte AI+ Windows Assistant

Chrome拡張「Karte AI+」のWindows版デスクトップアプリケーションです。
任意のデスクトップアプリ上で定型文・AIを使い、カーソル位置に直接貼り付けできます。

## 機能（MVP v0.2.0）

- **定型文管理**: カテゴリ別に定型文を管理
- **直接貼り付け**: 定型文クリックでカーソル位置に自動貼り付け
- **ホットキー起動**: Ctrl+Alt+A でパネル表示/非表示
- **システムトレイ常駐**: バックグラウンドで常駐

## ビルド方法

### 必要環境

- Windows 10/11 (64bit)
- .NET 8.0 SDK

### ビルド手順

1. `build.bat` をダブルクリック
2. `publish/KarteAI-Assistant.exe` が生成される

```batch
# または手動でビルド
cd src
dotnet publish -c Release -o ../publish
```

### 出力ファイル

- `publish/KarteAI-Assistant.exe` - 単一実行ファイル（約60-80MB）
- .NET Runtimeは不要（Self-contained）

## 使い方

1. `KarteAI-Assistant.exe` を起動
2. システムトレイにアイコンが表示される
3. **Ctrl+Alt+A** でパネルを表示
4. カテゴリを選択して定型文をクリック → カーソル位置に貼り付け

### 定型文の追加

- パネル下部の入力欄に定型文を入力して「追加」
- 「管理」ボタンでカテゴリの追加・削除も可能

### 設定

- ホットキーの変更: `%APPDATA%\KarteAI\config.json`
- 定型文データ: `%APPDATA%\KarteAI\userdata.json`

## 配布方法

`publish/KarteAI-Assistant.exe` をそのまま配布できます。
インストーラーは不要で、ダブルクリックで起動します。

## 今後の予定

- [ ] 認証機能（Chrome拡張と同じバックエンド）
- [ ] AIチャット機能
- [ ] クラウド同期（Chrome拡張とデータ共有）
- [ ] 日時貼り付け機能

## 技術情報

- **フレームワーク**: .NET 8.0 / WPF
- **アーキテクチャ**: win-x64 Self-contained
- **データ保存先**: `%APPDATA%\KarteAI\`

## 参照ドキュメント

- 要件定義: `requirements/requirements_definition.md`
- 基本設計: `design/basic_design.md`

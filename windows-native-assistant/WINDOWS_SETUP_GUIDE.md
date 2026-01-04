# Windows環境でのセットアップガイド

## 前提条件

### 必須
- **Windows 10** (1809以降) または **Windows 11**
- **.NET 8.0 SDK**
  - ダウンロード: https://dotnet.microsoft.com/download/dotnet/8.0
  - インストーラー: `.NET 8.0 SDK x64` を選択

### 推奨
- **Visual Studio 2022** (Community版で可)
  - ワークロード: `.NET デスクトップ開発`
  - または **Visual Studio Code** + C# Dev Kit拡張機能

---

## ステップ1: リポジトリのクローン/プル

### Gitリポジトリから取得

```powershell
# 既にクローン済みの場合
cd path\to\Chrome_to_Medical
git pull origin main

# 初めてクローンする場合
git clone <repository-url>
cd Chrome_to_Medical\windows-native-assistant
```

---

## ステップ2: .NET SDKの確認

PowerShellまたはコマンドプロンプトで実行:

```powershell
dotnet --version
```

**期待される出力**: `8.0.x` （xは任意の数字）

**エラーが出る場合**:
1. .NET 8.0 SDK をダウンロード＆インストール
2. システムを再起動
3. もう一度 `dotnet --version` を確認

---

## ステップ3: アイコンファイルの準備（オプション）

アプリケーションアイコンを設定する場合:

1. **256x256ピクセル** の画像を準備
2. オンラインツールでICO形式に変換
   - https://www.icoconverter.com/
   - または https://convertio.co/ja/png-ico/
3. `src/app.ico` として保存

**スキップする場合**:
- `src/WindowsNativeAssistant.csproj` を開く
- `<ApplicationIcon>app.ico</ApplicationIcon>` 行をコメントアウトまたは削除

```xml
<!-- <ApplicationIcon>app.ico</ApplicationIcon> -->
```

---

## ステップ4: ビルド

### 方法1: ビルドスクリプト使用（推奨）

```cmd
cd windows-native-assistant
build.bat
```

**成功すると**:
```
========================================
Build completed successfully!

Executable location:
C:\path\to\windows-native-assistant\publish\WindowsNativeAssistant.exe
========================================
```

### 方法2: 手動ビルド

```powershell
cd windows-native-assistant\src

# パッケージの復元
dotnet restore

# ビルド
dotnet build -c Release

# 単一実行ファイルとして発行
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ..\publish
```

---

## ステップ5: 初回実行

### 実行ファイルの場所

```
windows-native-assistant\publish\WindowsNativeAssistant.exe
```

### 実行方法

1. **publish** フォルダを開く
2. **WindowsNativeAssistant.exe** をダブルクリック

### 初回起動時の動作

1. **Windows Defender SmartScreen** が表示される場合:
   - 「詳細情報」をクリック
   - 「実行」をクリック

2. **ホットキー登録**
   - デフォルト: `Ctrl+Alt+A`
   - 他のアプリと競合する場合は設定ファイルで変更

3. **システムトレイアイコン**
   - 画面右下のシステムトレイに表示される
   - 起動完了ダイアログが表示される

---

## ステップ6: 基本動作確認

### テスト1: ホットキー動作

1. **メモ帳（Notepad）** を起動
2. メモ帳にフォーカスを置く
3. **Ctrl+Alt+A** を押す
4. AIパネルが表示されることを確認

### テスト2: AI生成（要ネットワーク接続）

1. パネルで「要約」テンプレートを選択
2. 入力欄に以下を入力:
   ```
   患者: テスト
   主訴: 動作確認
   ```
3. 「生成して貼り付け」ボタンをクリック
4. メモ帳に自動で貼り付けられることを確認

---

## ステップ7: 設定変更（必要に応じて）

### 設定ファイルの場所

```
%APPDATA%\WindowsNativeAssistant\config.json
```

### 設定ファイルを開く

```powershell
notepad %APPDATA%\WindowsNativeAssistant\config.json
```

### 主な設定項目

```json
{
  "hotkey": {
    "modifiers": "Control+Alt",  // ホットキーの修飾キー
    "key": "A"                    // ホットキーのメインキー
  },
  "api": {
    "endpoint": "https://func-karte-ai-1763705952.azurewebsites.net/api/chat",
    "token": "",                  // 認証トークン（必要に応じて）
    "timeoutSeconds": 60          // タイムアウト秒数
  },
  "paste": {
    "retryCount": 2,              // 貼り付けリトライ回数
    "retryDelayMs": [200, 500]    // リトライ間隔（ミリ秒）
  },
  "logging": {
    "enabled": true,              // ログを有効化
    "includeContent": false,      // 生成内容をログに含める（推奨: false）
    "logPath": "logs"
  }
}
```

### ホットキーの変更例

他のアプリと競合する場合:

```json
{
  "hotkey": {
    "modifiers": "Control+Shift",
    "key": "M"
  }
}
```

変更後、アプリを再起動してください。

---

## トラブルシューティング

### 問題1: ビルドエラー "SDK not found"

**原因**: .NET 8.0 SDK がインストールされていない

**解決策**:
1. https://dotnet.microsoft.com/download/dotnet/8.0
2. `.NET 8.0 SDK x64` をダウンロード＆インストール
3. システムを再起動

---

### 問題2: ビルドエラー "app.ico が見つかりません"

**原因**: アイコンファイルが存在しない

**解決策A**: アイコンファイルを作成
- 画像を用意して `src/app.ico` として保存

**解決策B**: アイコンを無効化
```xml
<!-- src/WindowsNativeAssistant.csproj を編集 -->
<!-- 以下の行をコメントアウト -->
<!-- <ApplicationIcon>app.ico</ApplicationIcon> -->
```

---

### 問題3: "ホットキーの登録に失敗しました"

**原因**: 他のアプリケーションが同じホットキーを使用

**解決策**:
1. タスクマネージャーで競合するアプリを終了
2. または設定ファイルでホットキーを変更:
   ```json
   "hotkey": {
     "modifiers": "Control+Shift",
     "key": "M"
   }
   ```

---

### 問題4: "AI生成に失敗しました"

**原因1**: ネットワーク接続なし
- インターネット接続を確認

**原因2**: APIエンドポイント到達不可
- `config.json` の `api.endpoint` を確認
- ブラウザで直接アクセスしてみる

**原因3**: タイムアウト
- `api.timeoutSeconds` を増やす（例: 120）

---

### 問題5: "貼り付けに失敗しました"

**原因**: 対象ウィンドウのフォーカスが外れた

**解決策**:
1. 貼り付け先ウィンドウが最前面にあることを確認
2. 入力欄にカーソルがあることを確認
3. リトライ回数を増やす:
   ```json
   "paste": {
     "retryCount": 3,
     "retryDelayMs": [300, 600, 1000]
   }
   ```

---

## ログの確認

### ログファイルの場所

```
%APPDATA%\WindowsNativeAssistant\logs\
```

### 操作ログ

```
logs\operations_2026-01-04.log
```

成功/失敗、リトライ回数などが記録されます。

### エラーログ

```
logs\errors_2026-01-04.log
```

例外やエラーの詳細が記録されます。

---

## 次のステップ

### より詳しいテスト

`TESTING_CHECKLIST.md` を参照して、包括的なテストを実施してください。

### コードレビュー結果

`CODE_REVIEW_REPORT.md` に改善提案が記載されています。

### 開発環境セットアップ（開発者向け）

Visual Studio 2022 または VS Code で `src/WindowsNativeAssistant.csproj` を開いて、デバッグ実行やコード編集が可能です。

---

## サポート

### ドキュメント
- `README_IMPLEMENTATION.md` - 詳細な実装ガイド
- `PROJECT_SUMMARY.md` - プロジェクト概要
- `CODE_REVIEW_REPORT.md` - コードレビュー報告
- `TESTING_CHECKLIST.md` - テストチェックリスト

### ログ確認
問題が発生した場合は、以下のログを確認してください:
```
%APPDATA%\WindowsNativeAssistant\logs\
```

---

**Windows Native Assistant v0.1.0**
**EMS MAPS向けAI診療記録生成支援ツール**
